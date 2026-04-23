-- 用途：为“云栖名册”创建或迁移数据表、RLS、公开 RPC 与后台管理 RPC。
-- 使用方式：把本文内容复制到 Supabase SQL Editor 执行一次即可。

create extension if not exists pgcrypto;

-- 这里创建回执号序列，保证每次登记都能拿到递增回执。
create sequence if not exists public.yunqi_roster_receipt_seq start 1;

-- 这里停用旧的自动牒号序列，新版改成按当前最大正式牒号加一来推荐。
drop sequence if exists public.yunqi_roster_entry_no_seq;

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

-- 这里统一清洗单行短文本，方便前后端保持相同去空格口径。
create or replace function public.clean_yunqi_short_text(input_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(trim(coalesce(input_text, '')), '\s+', ' ', 'g');
$$;

-- 这里统一处理道号唯一性比较口径，按去首尾空格后的小写值去重。
create or replace function public.normalize_yunqi_daohao(input_text text)
returns text
language sql
immutable
as $$
  select lower(public.clean_yunqi_short_text(input_text));
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

-- 这里把“12”“0012”“云栖-第0012号”都统一识别成数字 12。
create or replace function public.parse_yunqi_entry_no(input_text text)
returns integer
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(input_text, ''), '[^0-9]', '', 'g') = '' then null
    else regexp_replace(coalesce(input_text, ''), '[^0-9]', '', 'g')::integer
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

-- 这里计算下一个建议文牒号，新版不再依赖 sequence。
create or replace function public.get_next_yunqi_entry_no()
returns integer
language sql
stable
as $$
  select coalesce(max(entry_no), 0) + 1
  from public.yunqi_roster_entries;
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
  daohao text not null default '',
  secular_name text not null default '',
  gender text not null default '' check (gender in ('male', 'female', 'other', '')),
  current_city text not null default '',
  birth_year text not null default '',
  profession text not null default '',
  referrer_name text not null default '自行登门',
  hall_key text not null default 'other' check (hall_key in ('yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other')),
  hall_other_text text not null default '',
  entry_intent text not null default '',
  wechat_id text not null default '',
  social_xiaohongshu_douyin text not null default '',
  social_qq text not null default '',
  social_other text not null default '',
  allow_contact_public boolean not null default false,
  strengths text not null default '',
  hobbies text not null default '',
  free_time_slots text[] not null default '{}'::text[],
  contribution_level text not null default 'focus_on_learning' check (contribution_level in ('steward', 'help_when_available', 'focus_on_learning')),
  oath_signed_name text not null default '',
  oath_signed_date date not null default current_date,
  review_comment text not null default '',
  reviewed_by_user_id uuid,
  reviewed_by_name text not null default '',
  reviewed_at timestamptz,
  effective_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 这里确保旧库升级后也拥有新版字段。
alter table public.yunqi_roster_entries add column if not exists daohao text not null default '';
alter table public.yunqi_roster_entries add column if not exists gender text not null default '';
alter table public.yunqi_roster_entries add column if not exists referrer_name text not null default '自行登门';
alter table public.yunqi_roster_entries add column if not exists hall_other_text text not null default '';
alter table public.yunqi_roster_entries add column if not exists social_xiaohongshu_douyin text not null default '';
alter table public.yunqi_roster_entries add column if not exists social_qq text not null default '';
alter table public.yunqi_roster_entries add column if not exists social_other text not null default '';
alter table public.yunqi_roster_entries add column if not exists allow_contact_public boolean not null default false;
alter table public.yunqi_roster_entries add column if not exists strengths text not null default '';
alter table public.yunqi_roster_entries add column if not exists hobbies text not null default '';
alter table public.yunqi_roster_entries add column if not exists free_time_slots text[] not null default '{}'::text[];
alter table public.yunqi_roster_entries add column if not exists review_comment text not null default '';
alter table public.yunqi_roster_entries add column if not exists reviewed_by_user_id uuid;
alter table public.yunqi_roster_entries add column if not exists reviewed_by_name text not null default '';
alter table public.yunqi_roster_entries add column if not exists reviewed_at timestamptz;
alter table public.yunqi_roster_entries add column if not exists effective_date date;
alter table public.yunqi_roster_entries add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.yunqi_roster_entries add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- 这里把旧库里的“江湖名号 + 法号”口径迁移成单一“道号”字段。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yunqi_roster_entries'
      and column_name = 'effective_style_name'
  ) then
    execute '
      update public.yunqi_roster_entries
      set daohao = public.clean_yunqi_short_text(
        coalesce(
          nullif(daohao, ''''),
          nullif(effective_style_name, ''''),
          nullif(requested_style_name, ''''),
          jianghu_name
        )
      )
      where public.clean_yunqi_short_text(daohao) = ''''
    ';
  else
    update public.yunqi_roster_entries
    set daohao = public.clean_yunqi_short_text(daohao)
    where daohao <> public.clean_yunqi_short_text(daohao);
  end if;
end;
$$;

alter table public.yunqi_roster_entries drop constraint if exists yunqi_roster_entries_gender_check;
alter table public.yunqi_roster_entries
add constraint yunqi_roster_entries_gender_check
check (gender in ('male', 'female', 'other', ''));

-- 这里把非准予状态记录上的旧文牒号清掉，防止公开口径混乱。
update public.yunqi_roster_entries
set entry_no = null,
    effective_date = null
where status <> 'approved';

-- 这里删除旧的双字段名称列，后续业务层只认 daohao。
alter table public.yunqi_roster_entries drop column if exists jianghu_name;
alter table public.yunqi_roster_entries drop column if exists requested_style_name;
alter table public.yunqi_roster_entries drop column if exists effective_style_name;

-- 这里创建审核日志表，记录后台保存、状态变更和文牒号调整痕迹。
create table if not exists public.yunqi_roster_review_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.yunqi_roster_entries(id) on delete cascade,
  action_type text not null default 'save',
  previous_status text check (previous_status in ('pending', 'approved', 'deferred', 'rejected')),
  next_status text not null check (next_status in ('pending', 'approved', 'deferred', 'rejected')),
  previous_daohao text not null default '',
  next_daohao text not null default '',
  previous_entry_no integer,
  next_entry_no integer,
  review_comment text not null default '',
  reviewed_by_user_id uuid not null,
  reviewed_by_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 这里把旧日志表结构迁移到新版口径。
alter table public.yunqi_roster_review_logs add column if not exists action_type text not null default 'save';
alter table public.yunqi_roster_review_logs add column if not exists previous_daohao text not null default '';
alter table public.yunqi_roster_review_logs add column if not exists next_daohao text not null default '';
alter table public.yunqi_roster_review_logs add column if not exists previous_entry_no integer;
alter table public.yunqi_roster_review_logs add column if not exists next_entry_no integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yunqi_roster_review_logs'
      and column_name = 'previous_style_name'
  ) then
    execute '
      update public.yunqi_roster_review_logs
      set previous_daohao = coalesce(nullif(previous_daohao, ''''), previous_style_name),
          next_daohao = coalesce(nullif(next_daohao, ''''), next_style_name)
      where previous_daohao = ''''
         or next_daohao = ''''
    ';
  end if;
end;
$$;

alter table public.yunqi_roster_review_logs drop column if exists previous_style_name;
alter table public.yunqi_roster_review_logs drop column if exists next_style_name;

create index if not exists idx_yunqi_roster_entries_status on public.yunqi_roster_entries(status);
create index if not exists idx_yunqi_roster_entries_hall_key on public.yunqi_roster_entries(hall_key);
create index if not exists idx_yunqi_roster_entries_reviewed_at on public.yunqi_roster_entries(reviewed_at desc nulls last);
create index if not exists idx_yunqi_roster_entries_created_at on public.yunqi_roster_entries(created_at desc);
create index if not exists idx_yunqi_roster_entries_daohao on public.yunqi_roster_entries(daohao);
create unique index if not exists idx_yunqi_roster_entries_daohao_unique on public.yunqi_roster_entries(public.normalize_yunqi_daohao(daohao));
create index if not exists idx_yunqi_roster_review_logs_entry_id on public.yunqi_roster_review_logs(entry_id);

drop index if exists idx_yunqi_roster_entries_jianghu_name;
drop index if exists idx_yunqi_roster_entries_requested_style_name;
drop index if exists idx_yunqi_roster_entries_effective_style_name;

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

-- 这里读取当前执事显示名，保存日志和审核信息时会用到。
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

-- 这里集中处理道号唯一性校验。
create or replace function public.is_yunqi_daohao_available(input_daohao text, exclude_entry_id uuid default null)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
    from public.yunqi_roster_entries
    where public.normalize_yunqi_daohao(daohao) = public.normalize_yunqi_daohao(input_daohao)
      and (exclude_entry_id is null or id <> exclude_entry_id)
  );
$$;

-- 这里给前台提供道号重名检查接口。
drop function if exists public.check_roster_daohao_available(text);
create or replace function public.check_roster_daohao_available(input_daohao text)
returns table (
  available boolean,
  daohao text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_daohao text := public.clean_yunqi_short_text(input_daohao);
  is_available boolean := false;
begin
  if cleaned_daohao = '' then
    return query
    select false, cleaned_daohao, '请先填写道号';
    return;
  end if;

  if char_length(cleaned_daohao) > 12 then
    return query
    select false, cleaned_daohao, '道号最多支持 12 个字，请再精简一些';
    return;
  end if;

  is_available := public.is_yunqi_daohao_available(cleaned_daohao);

  if is_available then
    return query
    select true, cleaned_daohao, '此道号当前可用';
    return;
  end if;

  return query
  select false, cleaned_daohao, '此道号已被占用，请改用新的道号';
end;
$$;

-- 这里提供公开登记提交接口，匿名用户只能通过它写入数据。
drop function if exists public.submit_roster_entry(jsonb);
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
  normalized_daohao text := public.clean_yunqi_short_text(entry_payload ->> 'daohao');
  normalized_secular_name text := public.clean_yunqi_short_text(entry_payload ->> 'secular_name');
  normalized_gender text := public.clean_yunqi_short_text(entry_payload ->> 'gender');
  normalized_current_city text := public.clean_yunqi_short_text(entry_payload ->> 'current_city');
  normalized_birth_year text := public.clean_yunqi_short_text(entry_payload ->> 'birth_year');
  normalized_profession text := public.clean_yunqi_short_text(entry_payload ->> 'profession');
  normalized_referrer_name text := public.clean_yunqi_short_text(entry_payload ->> 'referrer_name');
  normalized_hall_key text := public.clean_yunqi_short_text(entry_payload ->> 'hall_key');
  normalized_hall_other_text text := public.clean_yunqi_short_text(entry_payload ->> 'hall_other_text');
  normalized_entry_intent text := trim(coalesce(entry_payload ->> 'entry_intent', ''));
  normalized_wechat_id text := public.clean_yunqi_short_text(entry_payload ->> 'wechat_id');
  normalized_social_xiaohongshu_douyin text := public.clean_yunqi_short_text(entry_payload ->> 'social_xiaohongshu_douyin');
  normalized_social_qq text := public.clean_yunqi_short_text(entry_payload ->> 'social_qq');
  normalized_social_other text := public.clean_yunqi_short_text(entry_payload ->> 'social_other');
  normalized_strengths text := trim(coalesce(entry_payload ->> 'strengths', ''));
  normalized_hobbies text := trim(coalesce(entry_payload ->> 'hobbies', ''));
  normalized_oath_name text := public.clean_yunqi_short_text(entry_payload ->> 'oath_signed_name');
  normalized_oath_date text := trim(coalesce(entry_payload ->> 'oath_signed_date', ''));
  normalized_contribution_level text := coalesce(nullif(public.clean_yunqi_short_text(entry_payload ->> 'contribution_level'), ''), 'focus_on_learning');
  inserted_record public.yunqi_roster_entries%rowtype;
  free_time_values text[] := coalesce(
    array(
      select jsonb_array_elements_text(coalesce(entry_payload -> 'free_time_slots', '[]'::jsonb))
    ),
    array[]::text[]
  );
begin
  if normalized_daohao = '' then
    raise exception '请填写道号';
  end if;

  if char_length(normalized_daohao) > 12 then
    raise exception '道号最多支持 12 个字，请再精简一些';
  end if;

  if not public.is_yunqi_daohao_available(normalized_daohao) then
    raise exception '该道号已被占用，请改用新的道号';
  end if;

  if normalized_current_city = '' then
    raise exception '请填写现居洞府';
  end if;

  if normalized_secular_name = '' then
    raise exception '请填写俗家姓名';
  end if;

  if normalized_gender not in ('male', 'female', 'other') then
    raise exception '请选择性别';
  end if;

  if normalized_birth_year = '' then
    raise exception '请填写生年';
  end if;

  if normalized_profession = '' then
    raise exception '请填写俗务';
  end if;

  if normalized_referrer_name = '' then
    raise exception '请填写引荐人；若无人引荐，请填写“自行登门”';
  end if;

  if normalized_hall_key not in ('yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other') then
    raise exception '请选择正确的归属堂口';
  end if;

  if normalized_hall_key = 'other' and normalized_hall_other_text = '' then
    raise exception '选择“其他”堂口时，请补充堂口说明';
  end if;

  if normalized_entry_intent = '' then
    raise exception '请填写入派本心';
  end if;

  if normalized_wechat_id = '' then
    raise exception '请填写核心传讯微信号';
  end if;

  if normalized_social_xiaohongshu_douyin = '' then
    raise exception '请填写小红书或抖音账号';
  end if;

  if normalized_social_qq = '' then
    raise exception '请填写 QQ';
  end if;

  if normalized_social_other = '' then
    raise exception '请填写其他传讯方式';
  end if;

  if normalized_strengths = '' then
    raise exception '请填写身怀所长';
  end if;

  if normalized_hobbies = '' then
    raise exception '请填写所好雅事';
  end if;

  if normalized_contribution_level not in ('steward', 'help_when_available', 'focus_on_learning') then
    raise exception '效力意愿填写不正确';
  end if;

  if normalized_oath_name = '' then
    raise exception '请填写弟子签押';
  end if;

  if normalized_oath_date = '' then
    raise exception '请填写立誓日期';
  end if;

  if exists (
    select 1
    from unnest(free_time_values) as item
    where item not in ('weekday_evening', 'weekend_all_day', 'holiday', 'other')
  ) then
    raise exception '闲暇时辰存在无效选项';
  end if;

  insert into public.yunqi_roster_entries (
    daohao,
    secular_name,
    gender,
    current_city,
    birth_year,
    profession,
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
    normalized_daohao,
    normalized_secular_name,
    normalized_gender,
    normalized_current_city,
    normalized_birth_year,
    normalized_profession,
    normalized_referrer_name,
    normalized_hall_key,
    normalized_hall_other_text,
    normalized_entry_intent,
    normalized_wechat_id,
    normalized_social_xiaohongshu_douyin,
    normalized_social_qq,
    normalized_social_other,
    coalesce((entry_payload ->> 'allow_contact_public')::boolean, false),
    normalized_strengths,
    normalized_hobbies,
    free_time_values,
    normalized_contribution_level,
    normalized_oath_name,
    normalized_oath_date::date
  )
  returning * into inserted_record;

  return query
  select inserted_record.public_slug, inserted_record.receipt_code, inserted_record.status;
end;
$$;

-- 这里提供公开名录接口，只返回审核通过且已脱敏的数据。
drop function if exists public.list_public_roster_entries(text, text, integer, integer);
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
  daohao text,
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
    entry.daohao,
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
      public.clean_yunqi_short_text(search_keyword) = ''
      or entry.daohao ilike '%' || public.clean_yunqi_short_text(search_keyword) || '%'
      or (
        public.parse_yunqi_entry_no(search_keyword) is not null
        and entry.entry_no = public.parse_yunqi_entry_no(search_keyword)
      )
    )
    and (
      public.clean_yunqi_short_text(hall_filter) = ''
      or entry.hall_key = public.clean_yunqi_short_text(hall_filter)
    )
  order by coalesce(entry.reviewed_at, entry.created_at) desc, entry.created_at desc
  limit greatest(page_size, 1)
  offset greatest(page_offset, 0);
$$;

-- 这里提供公开详情接口，按 slug 返回一条脱敏记录。
drop function if exists public.get_public_roster_entry_by_slug(text);
create or replace function public.get_public_roster_entry_by_slug(target_slug text)
returns table (
  public_slug text,
  status text,
  receipt_code text,
  entry_no integer,
  entry_no_text text,
  daohao text,
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
    entry.daohao,
    entry.hall_key,
    entry.entry_intent,
    entry.strengths,
    entry.hobbies,
    entry.review_comment,
    entry.created_at,
    entry.reviewed_at,
    entry.effective_date
  from public.yunqi_roster_entries as entry
  where entry.public_slug = public.clean_yunqi_short_text(target_slug)
  limit 1;
$$;

-- 这里给后台提供下一个建议文牒号接口，只允许执事调用。
drop function if exists public.get_next_roster_entry_no();
create or replace function public.get_next_roster_entry_no()
returns table (
  next_entry_no integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_yunqi_roster_admin() then
    raise exception '当前账号无执事权限';
  end if;

  return query
  select public.get_next_yunqi_entry_no();
end;
$$;

-- 这里统一处理后台保存动作，支持全字段编辑、状态修改与文牒号调整。
drop function if exists public.admin_save_roster_entry(jsonb);
create or replace function public.admin_save_roster_entry(entry_payload jsonb)
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
  target_entry_id uuid := nullif(trim(coalesce(entry_payload ->> 'entry_id', '')), '')::uuid;
  target_status text := public.clean_yunqi_short_text(entry_payload ->> 'status');
  target_entry_no integer := public.parse_yunqi_entry_no(entry_payload ->> 'entry_no');
  target_daohao text := public.clean_yunqi_short_text(entry_payload ->> 'daohao');
  target_secular_name text := public.clean_yunqi_short_text(entry_payload ->> 'secular_name');
  target_gender text := public.clean_yunqi_short_text(entry_payload ->> 'gender');
  target_current_city text := public.clean_yunqi_short_text(entry_payload ->> 'current_city');
  target_birth_year text := public.clean_yunqi_short_text(entry_payload ->> 'birth_year');
  target_profession text := public.clean_yunqi_short_text(entry_payload ->> 'profession');
  target_referrer_name text := public.clean_yunqi_short_text(entry_payload ->> 'referrer_name');
  target_hall_key text := public.clean_yunqi_short_text(entry_payload ->> 'hall_key');
  target_hall_other_text text := public.clean_yunqi_short_text(entry_payload ->> 'hall_other_text');
  target_entry_intent text := trim(coalesce(entry_payload ->> 'entry_intent', ''));
  target_wechat_id text := public.clean_yunqi_short_text(entry_payload ->> 'wechat_id');
  target_social_xiaohongshu_douyin text := public.clean_yunqi_short_text(entry_payload ->> 'social_xiaohongshu_douyin');
  target_social_qq text := public.clean_yunqi_short_text(entry_payload ->> 'social_qq');
  target_social_other text := public.clean_yunqi_short_text(entry_payload ->> 'social_other');
  target_strengths text := trim(coalesce(entry_payload ->> 'strengths', ''));
  target_hobbies text := trim(coalesce(entry_payload ->> 'hobbies', ''));
  target_contribution_level text := coalesce(nullif(public.clean_yunqi_short_text(entry_payload ->> 'contribution_level'), ''), 'focus_on_learning');
  target_oath_name text := public.clean_yunqi_short_text(entry_payload ->> 'oath_signed_name');
  target_oath_date text := trim(coalesce(entry_payload ->> 'oath_signed_date', ''));
  target_review_comment text := trim(coalesce(entry_payload ->> 'review_comment', ''));
  admin_display_name text := public.current_yunqi_admin_display_name();
  review_time timestamptz := timezone('utc', now());
  source_entry public.yunqi_roster_entries%rowtype;
  updated_entry public.yunqi_roster_entries%rowtype;
  final_entry_no integer;
  action_kind text := 'save';
  free_time_values text[] := coalesce(
    array(
      select jsonb_array_elements_text(coalesce(entry_payload -> 'free_time_slots', '[]'::jsonb))
    ),
    array[]::text[]
  );
begin
  if not public.is_active_yunqi_roster_admin() then
    raise exception '当前账号无执事权限';
  end if;

  if target_entry_id is null then
    raise exception '目标档案不存在';
  end if;

  if target_status not in ('pending', 'approved', 'deferred', 'rejected') then
    raise exception '档案状态不正确';
  end if;

  select *
  into source_entry
  from public.yunqi_roster_entries
  where id = target_entry_id
  for update;

  if source_entry.id is null then
    raise exception '目标档案不存在';
  end if;

  if target_daohao = '' then
    raise exception '请填写道号';
  end if;

  if char_length(target_daohao) > 12 then
    raise exception '道号最多支持 12 个字，请再精简一些';
  end if;

  if not public.is_yunqi_daohao_available(target_daohao, source_entry.id) then
    raise exception '该道号已被占用，请改用新的道号';
  end if;

  if target_current_city = '' then
    raise exception '请填写现居洞府';
  end if;

  if target_secular_name = '' then
    raise exception '请填写俗家姓名';
  end if;

  if target_gender not in ('male', 'female', 'other') then
    raise exception '请选择性别';
  end if;

  if target_birth_year = '' then
    raise exception '请填写生年';
  end if;

  if target_profession = '' then
    raise exception '请填写俗务';
  end if;

  if target_referrer_name = '' then
    raise exception '请填写引荐人；若无人引荐，请填写“自行登门”';
  end if;

  if target_hall_key not in ('yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other') then
    raise exception '请选择正确的归属堂口';
  end if;

  if target_hall_key = 'other' and target_hall_other_text = '' then
    raise exception '选择“其他”堂口时，请补充堂口说明';
  end if;

  if target_entry_intent = '' then
    raise exception '请填写入派本心';
  end if;

  if target_wechat_id = '' then
    raise exception '请填写核心传讯微信号';
  end if;

  if target_social_xiaohongshu_douyin = '' then
    raise exception '请填写小红书或抖音账号';
  end if;

  if target_social_qq = '' then
    raise exception '请填写 QQ';
  end if;

  if target_social_other = '' then
    raise exception '请填写其他传讯方式';
  end if;

  if target_strengths = '' then
    raise exception '请填写身怀所长';
  end if;

  if target_hobbies = '' then
    raise exception '请填写所好雅事';
  end if;

  if target_contribution_level not in ('steward', 'help_when_available', 'focus_on_learning') then
    raise exception '效力意愿填写不正确';
  end if;

  if target_oath_name = '' then
    raise exception '请填写弟子签押';
  end if;

  if target_oath_date = '' then
    raise exception '请填写立誓日期';
  end if;

  if exists (
    select 1
    from unnest(free_time_values) as item
    where item not in ('weekday_evening', 'weekend_all_day', 'holiday', 'other')
  ) then
    raise exception '闲暇时辰存在无效选项';
  end if;

  if target_status = 'approved' then
    final_entry_no := coalesce(target_entry_no, source_entry.entry_no, public.get_next_yunqi_entry_no());

    if final_entry_no is null or final_entry_no <= 0 then
      raise exception '准予入册时必须提供正确的文牒号';
    end if;

    if exists (
      select 1
      from public.yunqi_roster_entries
      where entry_no = final_entry_no
        and id <> source_entry.id
    ) then
      raise exception '该文牒号已被占用，请改用其他数字';
    end if;
  else
    final_entry_no := null;
  end if;

  if source_entry.status <> target_status then
    action_kind := 'status_change';
  end if;

  update public.yunqi_roster_entries
  set
    status = target_status,
    entry_no = final_entry_no,
    daohao = target_daohao,
    secular_name = target_secular_name,
    gender = target_gender,
    current_city = target_current_city,
    birth_year = target_birth_year,
    profession = target_profession,
    referrer_name = target_referrer_name,
    hall_key = target_hall_key,
    hall_other_text = target_hall_other_text,
    entry_intent = target_entry_intent,
    wechat_id = target_wechat_id,
    social_xiaohongshu_douyin = target_social_xiaohongshu_douyin,
    social_qq = target_social_qq,
    social_other = target_social_other,
    allow_contact_public = coalesce((entry_payload ->> 'allow_contact_public')::boolean, false),
    strengths = target_strengths,
    hobbies = target_hobbies,
    free_time_slots = free_time_values,
    contribution_level = target_contribution_level,
    oath_signed_name = target_oath_name,
    oath_signed_date = target_oath_date::date,
    review_comment = target_review_comment,
    reviewed_by_user_id = auth.uid(),
    reviewed_by_name = admin_display_name,
    reviewed_at = review_time,
    effective_date = case
      when target_status = 'approved' then coalesce(source_entry.effective_date, current_date)
      else null
    end
  where id = source_entry.id
  returning * into updated_entry;

  insert into public.yunqi_roster_review_logs (
    entry_id,
    action_type,
    previous_status,
    next_status,
    previous_daohao,
    next_daohao,
    previous_entry_no,
    next_entry_no,
    review_comment,
    reviewed_by_user_id,
    reviewed_by_name
  )
  values (
    source_entry.id,
    action_kind,
    source_entry.status,
    updated_entry.status,
    source_entry.daohao,
    updated_entry.daohao,
    source_entry.entry_no,
    updated_entry.entry_no,
    updated_entry.review_comment,
    auth.uid(),
    admin_display_name
  );

  return query
  select
    updated_entry.id,
    updated_entry.status,
    public.format_yunqi_entry_no(updated_entry.entry_no),
    review_time;
end;
$$;

-- 这里统一处理后台删除动作，采用不可恢复的硬删除。
drop function if exists public.admin_delete_roster_entry(uuid);
create or replace function public.admin_delete_roster_entry(target_entry_id uuid)
returns table (
  entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_entry_id uuid;
begin
  if not public.is_active_yunqi_roster_admin() then
    raise exception '当前账号无执事权限';
  end if;

  delete from public.yunqi_roster_entries
  where id = target_entry_id
  returning id into deleted_entry_id;

  if deleted_entry_id is null then
    raise exception '目标档案不存在，无法删除';
  end if;

  return query
  select deleted_entry_id;
end;
$$;

-- 这里删掉旧函数，避免后续继续误用旧的法号接口。
drop function if exists public.review_roster_entry(uuid, text, text, text);
drop function if exists public.check_roster_style_name_available(text);
drop function if exists public.get_yunqi_style_name_suggestions(text);
drop function if exists public.is_yunqi_style_name_available(text, uuid);
drop function if exists public.normalize_yunqi_style_name(text);

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

drop policy if exists "yunqi_roster_entries_admin_delete" on public.yunqi_roster_entries;
create policy "yunqi_roster_entries_admin_delete"
on public.yunqi_roster_entries
for delete
to authenticated
using (public.is_active_yunqi_roster_admin());

drop policy if exists "yunqi_roster_review_logs_admin_select" on public.yunqi_roster_review_logs;
create policy "yunqi_roster_review_logs_admin_select"
on public.yunqi_roster_review_logs
for select
to authenticated
using (public.is_active_yunqi_roster_admin());

-- 这里给项目维护者留一条示例，首次创建执事账号时可按实际邮箱修改后执行。
-- insert into public.yunqi_roster_admin_profiles (user_id, email, display_name, role, is_active)
-- values ('此处替换为 auth.users.id', 'your-email@example.com', '执事名', 'steward', true)
-- on conflict (user_id) do update
-- set email = excluded.email,
--     display_name = excluded.display_name,
--     role = excluded.role,
--     is_active = excluded.is_active;
