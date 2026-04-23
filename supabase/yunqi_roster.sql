-- 用途：为“云栖名册”创建数据表、RLS、公开 RPC 与审核 RPC。
-- 使用方式：把本文件内容复制到 Supabase SQL Editor 执行一次即可。

create extension if not exists pgcrypto;

-- 这里创建回执号序列，保证每次登记都能拿到递增回执。
create sequence if not exists public.yunqi_roster_receipt_seq start 1;

-- 这里创建正式牒号序列，审核通过时用来顺延编号。
create sequence if not exists public.yunqi_roster_entry_no_seq start 1;

-- 这里统一处理更新时间字段，避免每次手写 now()。
create or replace function public.set_yunqi_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 这里统一清洗法号文本，方便做重名校验。
create or replace function public.normalize_yunqi_style_name(input_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(trim(coalesce(input_text, '')), '\s+', '', 'g');
$$;

-- 这里把正式牒号格式统一成“云栖-第0001号”。
create or replace function public.format_yunqi_entry_no(input_no integer)
returns text
language sql
immutable
as $$
  select case
    when input_no is null or input_no <= 0 then ''
    else '云栖-第' || lpad(input_no::text, 4, '0') || '号'
  end;
$$;

-- 这里生成公开详情 slug，避免直接暴露主键。
create or replace function public.generate_yunqi_public_slug()
returns text
language plpgsql
as $$
declare
  candidate_slug text;
begin
  loop
    candidate_slug := 'yx-' || to_char(timezone('utc', now()), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    exit when not exists (
      select 1
      from public.yunqi_roster_entries
      where public_slug = candidate_slug
    );
  end loop;

  return candidate_slug;
end;
$$;

-- 这里生成回执号，提交成功后立刻返回给前台。
create or replace function public.generate_yunqi_receipt_code()
returns text
language sql
as $$
  select '回执-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || lpad(nextval('public.yunqi_roster_receipt_seq')::text, 4, '0');
$$;

-- 这里创建管理员资料表，站内审核台靠它做白名单校验。
create table if not exists public.yunqi_roster_admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'steward',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 这里创建主表，保存所有登记原始数据。
create table if not exists public.yunqi_roster_entries (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique default public.generate_yunqi_public_slug(),
  receipt_code text not null unique default public.generate_yunqi_receipt_code(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'deferred', 'rejected')),
  entry_no integer unique,
  jianghu_name text not null,
  secular_name text not null default '',
  current_city text not null,
  birth_year text not null default '',
  profession text not null default '',
  requested_style_name text not null,
  effective_style_name text not null default '',
  referrer_name text not null default '自行登门',
  hall_key text not null check (hall_key in ('yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other')),
  hall_other_text text not null default '',
  entry_intent text not null,
  wechat_id text not null,
  social_xiaohongshu_douyin text not null default '',
  social_qq text not null default '',
  social_other text not null default '',
  allow_contact_public boolean not null default false,
  strengths text not null default '',
  hobbies text not null default '',
  free_time_slots text[] not null default '{}'::text[],
  contribution_level text not null check (contribution_level in ('steward', 'help_when_available', 'focus_on_learning')),
  oath_signed_name text not null,
  oath_signed_date date not null,
  review_comment text not null default '',
  reviewed_by_user_id uuid,
  reviewed_by_name text not null default '',
  reviewed_at timestamptz,
  effective_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 这里创建审核日志表，避免审批痕迹丢失。
create table if not exists public.yunqi_roster_review_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.yunqi_roster_entries(id) on delete cascade,
  previous_status text check (previous_status in ('pending', 'approved', 'deferred', 'rejected')),
  next_status text not null check (next_status in ('pending', 'approved', 'deferred', 'rejected')),
  previous_style_name text not null default '',
  next_style_name text not null default '',
  review_comment text not null default '',
  reviewed_by_user_id uuid not null,
  reviewed_by_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_yunqi_roster_entries_status on public.yunqi_roster_entries(status);
create index if not exists idx_yunqi_roster_entries_hall_key on public.yunqi_roster_entries(hall_key);
create index if not exists idx_yunqi_roster_entries_reviewed_at on public.yunqi_roster_entries(reviewed_at desc nulls last);
create index if not exists idx_yunqi_roster_entries_created_at on public.yunqi_roster_entries(created_at desc);
create index if not exists idx_yunqi_roster_entries_jianghu_name on public.yunqi_roster_entries(jianghu_name);
create index if not exists idx_yunqi_roster_entries_requested_style_name on public.yunqi_roster_entries(requested_style_name);
create index if not exists idx_yunqi_roster_entries_effective_style_name on public.yunqi_roster_entries(effective_style_name);
create index if not exists idx_yunqi_roster_review_logs_entry_id on public.yunqi_roster_review_logs(entry_id);

drop trigger if exists trg_yunqi_roster_admin_profiles_updated_at on public.yunqi_roster_admin_profiles;
create trigger trg_yunqi_roster_admin_profiles_updated_at
before update on public.yunqi_roster_admin_profiles
for each row
execute function public.set_yunqi_updated_at();

drop trigger if exists trg_yunqi_roster_entries_updated_at on public.yunqi_roster_entries;
create trigger trg_yunqi_roster_entries_updated_at
before update on public.yunqi_roster_entries
for each row
execute function public.set_yunqi_updated_at();

-- 这里判断当前登录用户是不是启用中的执事管理员。
create or replace function public.is_active_yunqi_roster_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.yunqi_roster_admin_profiles
    where user_id = auth.uid()
      and is_active = true
  );
$$;

-- 这里拿管理员显示名，审核写日志时会用到。
create or replace function public.current_yunqi_admin_display_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select display_name
      from public.yunqi_roster_admin_profiles
      where user_id = auth.uid()
        and is_active = true
      limit 1
    ),
    ''
  );
$$;

-- 这里集中管理法号近邻推荐，重名时会从同字辈里给出几条建议。
create or replace function public.get_yunqi_style_name_suggestions(input_style_name text)
returns text[]
language plpgsql
immutable
as $$
declare
  normalized_name text := public.normalize_yunqi_style_name(input_style_name);
  yun_names text[] := array[
    '云川', '云岫', '云汀', '云涧', '云泽', '云峦', '云溪', '云涯', '云渚', '云壑',
    '云涛', '云潮', '云墨', '云笺', '云砚', '云笔', '云弦', '云笙', '云箫', '云琴',
    '云舒', '云卷', '云闲', '云宁', '云安', '云霁', '云岚', '云烟', '云铮', '云朗'
  ];
  qi_names text[] := array[
    '栖梧', '栖竹', '栖兰', '栖梅', '栖菊', '栖荷', '栖桂', '栖棠', '栖月', '栖风',
    '栖星', '栖露', '栖霜', '栖雪', '栖霞', '栖虹', '栖雾', '栖雨', '栖琴', '栖棋',
    '栖书', '栖画', '栖诗', '栖茶', '栖香', '栖砚', '栖安', '栖宁', '栖心', '栖然'
  ];
begin
  if left(normalized_name, 1) = '云' then
    return coalesce(
      (
        select array_agg(item)
        from (
          select item
          from unnest(yun_names) as item
          where item <> normalized_name
          limit 6
        ) as suggestion_rows
      ),
      array[]::text[]
    );
  end if;

  return coalesce(
    (
      select array_agg(item)
      from (
        select item
        from unnest(qi_names) as item
        where item <> normalized_name
        limit 6
      ) as suggestion_rows
    ),
    array[]::text[]
  );
end;
$$;

-- 这里检查某个法号当前是否仍可占用。
create or replace function public.is_yunqi_style_name_available(input_style_name text, exclude_entry_id uuid default null)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
    from public.yunqi_roster_entries
    where status in ('pending', 'approved', 'deferred')
      and public.normalize_yunqi_style_name(coalesce(nullif(effective_style_name, ''), requested_style_name)) = public.normalize_yunqi_style_name(input_style_name)
      and (exclude_entry_id is null or id <> exclude_entry_id)
  );
$$;

-- 这里给前台提供重名检查接口。
create or replace function public.check_roster_style_name_available(input_style_name text)
returns table (
  available boolean,
  style_name text,
  suggestions text[],
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := public.normalize_yunqi_style_name(input_style_name);
  is_available boolean := false;
  suggestion_list text[] := array[]::text[];
  message_text text := '';
begin
  if normalized_name = '' then
    return query
    select false, normalized_name, array[]::text[], '请先填写云栖法号';
    return;
  end if;

  if normalized_name !~ '^[云栖][一-龥]$' then
    return query
    select false, normalized_name, public.get_yunqi_style_name_suggestions(normalized_name), '云栖法号必须以“云”或“栖”开头，且固定为两个汉字';
    return;
  end if;

  is_available := public.is_yunqi_style_name_available(normalized_name);
  suggestion_list := public.get_yunqi_style_name_suggestions(normalized_name);

  if is_available then
    message_text := '此法号当前可用';
  else
    message_text := '此法号已被保留，请另择同组字号';
  end if;

  return query
  select is_available, normalized_name, suggestion_list, message_text;
end;
$$;

-- 这里提供公开登记提交接口，匿名用户只能通过它写入数据。
create or replace function public.submit_roster_entry(entry_payload jsonb)
returns table (
  public_slug text,
  receipt_code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_jianghu_name text := trim(coalesce(entry_payload ->> 'jianghu_name', ''));
  normalized_current_city text := trim(coalesce(entry_payload ->> 'current_city', ''));
  normalized_style_name text := public.normalize_yunqi_style_name(entry_payload ->> 'requested_style_name');
  normalized_hall_key text := trim(coalesce(entry_payload ->> 'hall_key', ''));
  normalized_entry_intent text := trim(coalesce(entry_payload ->> 'entry_intent', ''));
  normalized_wechat_id text := trim(coalesce(entry_payload ->> 'wechat_id', ''));
  normalized_oath_name text := trim(coalesce(entry_payload ->> 'oath_signed_name', ''));
  normalized_oath_date text := trim(coalesce(entry_payload ->> 'oath_signed_date', ''));
  inserted_record public.yunqi_roster_entries%rowtype;
  free_time_values text[] := coalesce(
    array(
      select jsonb_array_elements_text(coalesce(entry_payload -> 'free_time_slots', '[]'::jsonb))
    ),
    array[]::text[]
  );
begin
  if normalized_jianghu_name = '' then
    raise exception '请填写江湖名号';
  end if;

  if normalized_current_city = '' then
    raise exception '请填写现居洞府';
  end if;

  if normalized_style_name = '' then
    raise exception '请填写云栖法号';
  end if;

  if normalized_style_name !~ '^[云栖][一-龥]$' then
    raise exception '云栖法号必须以“云”或“栖”开头，且固定为两个汉字';
  end if;

  if normalized_hall_key not in ('yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other') then
    raise exception '请选择正确的归属堂口';
  end if;

  if normalized_entry_intent = '' then
    raise exception '请填写入派本心';
  end if;

  if normalized_wechat_id = '' then
    raise exception '请填写核心传讯微信号';
  end if;

  if normalized_oath_name = '' then
    raise exception '请填写弟子签押';
  end if;

  if normalized_oath_date = '' then
    raise exception '请填写立誓日期';
  end if;

  if not public.is_yunqi_style_name_available(normalized_style_name) then
    raise exception '该云栖法号已被保留，请另择字号';
  end if;

  insert into public.yunqi_roster_entries (
    jianghu_name,
    secular_name,
    current_city,
    birth_year,
    profession,
    requested_style_name,
    referrer_name,
    hall_key,
    hall_other_text,
    entry_intent,
    wechat_id,
    social_xiaohongshu_douyin,
    social_qq,
    social_other,
    allow_contact_public,
    strengths,
    hobbies,
    free_time_slots,
    contribution_level,
    oath_signed_name,
    oath_signed_date
  )
  values (
    normalized_jianghu_name,
    trim(coalesce(entry_payload ->> 'secular_name', '')),
    normalized_current_city,
    trim(coalesce(entry_payload ->> 'birth_year', '')),
    trim(coalesce(entry_payload ->> 'profession', '')),
    normalized_style_name,
    coalesce(nullif(trim(coalesce(entry_payload ->> 'referrer_name', '')), ''), '自行登门'),
    normalized_hall_key,
    trim(coalesce(entry_payload ->> 'hall_other_text', '')),
    normalized_entry_intent,
    normalized_wechat_id,
    trim(coalesce(entry_payload ->> 'social_xiaohongshu_douyin', '')),
    trim(coalesce(entry_payload ->> 'social_qq', '')),
    trim(coalesce(entry_payload ->> 'social_other', '')),
    coalesce((entry_payload ->> 'allow_contact_public')::boolean, false),
    trim(coalesce(entry_payload ->> 'strengths', '')),
    trim(coalesce(entry_payload ->> 'hobbies', '')),
    free_time_values,
    coalesce(nullif(trim(coalesce(entry_payload ->> 'contribution_level', '')), ''), 'focus_on_learning'),
    normalized_oath_name,
    normalized_oath_date::date
  )
  returning * into inserted_record;

  return query
  select inserted_record.public_slug, inserted_record.receipt_code, inserted_record.status;
end;
$$;

-- 这里提供公开名录接口，只返回审核通过且已脱敏的数据。
create or replace function public.list_public_roster_entries(
  search_keyword text default '',
  hall_filter text default '',
  page_size integer default 24,
  page_offset integer default 0
)
returns table (
  public_slug text,
  status text,
  receipt_code text,
  entry_no integer,
  entry_no_text text,
  jianghu_name text,
  style_name text,
  hall_key text,
  entry_intent text,
  strengths text,
  hobbies text,
  review_comment text,
  created_at timestamptz,
  reviewed_at timestamptz,
  effective_date date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    entry.public_slug,
    entry.status,
    entry.receipt_code,
    entry.entry_no,
    public.format_yunqi_entry_no(entry.entry_no) as entry_no_text,
    entry.jianghu_name,
    coalesce(nullif(entry.effective_style_name, ''), entry.requested_style_name) as style_name,
    entry.hall_key,
    entry.entry_intent,
    entry.strengths,
    entry.hobbies,
    entry.review_comment,
    entry.created_at,
    entry.reviewed_at,
    entry.effective_date
  from public.yunqi_roster_entries as entry
  where entry.status = 'approved'
    and (
      trim(coalesce(search_keyword, '')) = ''
      or entry.jianghu_name ilike '%' || trim(search_keyword) || '%'
      or coalesce(nullif(entry.effective_style_name, ''), entry.requested_style_name) ilike '%' || trim(search_keyword) || '%'
    )
    and (
      trim(coalesce(hall_filter, '')) = ''
      or entry.hall_key = trim(hall_filter)
    )
  order by coalesce(entry.reviewed_at, entry.created_at) desc, entry.created_at desc
  limit greatest(page_size, 1)
  offset greatest(page_offset, 0);
$$;

-- 这里提供公开详情接口，按 slug 返回一条脱敏记录。
create or replace function public.get_public_roster_entry_by_slug(target_slug text)
returns table (
  public_slug text,
  status text,
  receipt_code text,
  entry_no integer,
  entry_no_text text,
  jianghu_name text,
  style_name text,
  hall_key text,
  entry_intent text,
  strengths text,
  hobbies text,
  review_comment text,
  created_at timestamptz,
  reviewed_at timestamptz,
  effective_date date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    entry.public_slug,
    entry.status,
    entry.receipt_code,
    entry.entry_no,
    public.format_yunqi_entry_no(entry.entry_no) as entry_no_text,
    entry.jianghu_name,
    coalesce(nullif(entry.effective_style_name, ''), entry.requested_style_name) as style_name,
    entry.hall_key,
    entry.entry_intent,
    entry.strengths,
    entry.hobbies,
    entry.review_comment,
    entry.created_at,
    entry.reviewed_at,
    entry.effective_date
  from public.yunqi_roster_entries as entry
  where entry.public_slug = trim(target_slug)
  limit 1;
$$;

-- 这里提供审核 RPC，统一处理状态流转、法号定稿和正式牒号分配。
create or replace function public.review_roster_entry(
  target_entry_id uuid,
  target_status text,
  target_effective_style_name text default '',
  target_review_comment text default ''
)
returns table (
  entry_id uuid,
  status text,
  entry_no_text text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  source_entry public.yunqi_roster_entries%rowtype;
  admin_display_name text := public.current_yunqi_admin_display_name();
  next_style_name text;
  next_entry_no integer;
  review_time timestamptz := timezone('utc', now());
begin
  if not public.is_active_yunqi_roster_admin() then
    raise exception '当前账号无执事审核权限';
  end if;

  if target_status not in ('approved', 'deferred', 'rejected') then
    raise exception '审核动作不正确';
  end if;

  select *
  into source_entry
  from public.yunqi_roster_entries
  where id = target_entry_id
  for update;

  if source_entry.id is null then
    raise exception '目标入册记录不存在';
  end if;

  next_style_name := public.normalize_yunqi_style_name(
    case
      when trim(coalesce(target_effective_style_name, '')) <> '' then target_effective_style_name
      else source_entry.requested_style_name
    end
  );

  if target_status = 'approved' then
    if next_style_name !~ '^[云栖][一-龥]$' then
      raise exception '准予入册时，最终法号必须以“云”或“栖”开头，且固定为两个汉字';
    end if;

    if not public.is_yunqi_style_name_available(next_style_name, source_entry.id) then
      raise exception '最终法号已被其他记录保留，请另择字号';
    end if;

    next_entry_no := coalesce(source_entry.entry_no, nextval('public.yunqi_roster_entry_no_seq'));
  else
    next_entry_no := source_entry.entry_no;
  end if;

  update public.yunqi_roster_entries
  set
    status = target_status,
    entry_no = next_entry_no,
    effective_style_name = case
      when target_status = 'approved' then next_style_name
      else coalesce(nullif(source_entry.effective_style_name, ''), source_entry.requested_style_name)
    end,
    review_comment = trim(coalesce(target_review_comment, '')),
    reviewed_by_user_id = auth.uid(),
    reviewed_by_name = admin_display_name,
    reviewed_at = review_time,
    effective_date = case
      when target_status = 'approved' then current_date
      else source_entry.effective_date
    end
  where id = source_entry.id;

  insert into public.yunqi_roster_review_logs (
    entry_id,
    previous_status,
    next_status,
    previous_style_name,
    next_style_name,
    review_comment,
    reviewed_by_user_id,
    reviewed_by_name
  )
  values (
    source_entry.id,
    source_entry.status,
    target_status,
    coalesce(nullif(source_entry.effective_style_name, ''), source_entry.requested_style_name),
    case
      when target_status = 'approved' then next_style_name
      else coalesce(nullif(source_entry.effective_style_name, ''), source_entry.requested_style_name)
    end,
    trim(coalesce(target_review_comment, '')),
    auth.uid(),
    admin_display_name
  );

  return query
  select
    source_entry.id,
    target_status,
    public.format_yunqi_entry_no(next_entry_no),
    review_time;
end;
$$;

alter table public.yunqi_roster_admin_profiles enable row level security;
alter table public.yunqi_roster_entries enable row level security;
alter table public.yunqi_roster_review_logs enable row level security;

drop policy if exists "yunqi_admin_profiles_select_self" on public.yunqi_roster_admin_profiles;
create policy "yunqi_admin_profiles_select_self"
on public.yunqi_roster_admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_active_yunqi_roster_admin());

drop policy if exists "yunqi_roster_entries_admin_select" on public.yunqi_roster_entries;
create policy "yunqi_roster_entries_admin_select"
on public.yunqi_roster_entries
for select
to authenticated
using (public.is_active_yunqi_roster_admin());

drop policy if exists "yunqi_roster_entries_admin_update" on public.yunqi_roster_entries;
create policy "yunqi_roster_entries_admin_update"
on public.yunqi_roster_entries
for update
to authenticated
using (public.is_active_yunqi_roster_admin())
with check (public.is_active_yunqi_roster_admin());

drop policy if exists "yunqi_roster_review_logs_admin_select" on public.yunqi_roster_review_logs;
create policy "yunqi_roster_review_logs_admin_select"
on public.yunqi_roster_review_logs
for select
to authenticated
using (public.is_active_yunqi_roster_admin());

-- 这里给项目维护者一条示例，首次创建执事账号时可按实际邮箱修改后执行。
-- insert into public.yunqi_roster_admin_profiles (user_id, email, display_name, role, is_active)
-- values ('此处替换为 auth.users.id', 'your-email@example.com', '执事名', 'steward', true)
-- on conflict (user_id) do update
-- set email = excluded.email,
--     display_name = excluded.display_name,
--     role = excluded.role,
--     is_active = excluded.is_active;
