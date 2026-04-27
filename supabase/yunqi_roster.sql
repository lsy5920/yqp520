-- 云栖名册手机端江湖卡册新版数据库脚本
-- 用途：创建全新的名帖表、审核日志表、权限策略，并提供旧名册一次性迁移桥。
-- 使用方式：在 Supabase SQL 编辑器中完整执行本脚本。

create extension if not exists pgcrypto;

-- 这里创建更新时间函数，所有核心表更新时自动刷新 updated_at。
create or replace function public.set_yunqi_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 这里清洗旧表迁移文本，避免旧姓名带着多余空格进入新版真实姓名字段。
create or replace function public.clean_yunqi_roster_legacy_text(input_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(coalesce(input_text, ''), '\s+', ' ', 'g'));
$$;

-- 这里保留管理员资料表，继续复用现有 Supabase 登录体系。
create table if not exists public.yunqi_roster_admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default '名册执事',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 这里兼容已经存在的旧管理员表；旧表如果缺少 id 列，补上后前后端都能稳定读取。
alter table public.yunqi_roster_admin_profiles add column if not exists id uuid default gen_random_uuid();
update public.yunqi_roster_admin_profiles set id = gen_random_uuid() where id is null;
alter table public.yunqi_roster_admin_profiles alter column id set not null;

-- 这里创建新版名帖表，业务代码只读写这张表。
create table if not exists public.yunqi_roster_cards (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique,
  jianghu_name text not null,
  dao_name text not null default '云未名',
  title_name text not null default '云栖同门',
  identity_key text not null,
  gender_key text not null default 'unspecified',
  region_text text not null default '云深不知处',
  motto text not null,
  story_text text not null,
  skill_tags text[] not null default '{}'::text[],
  bond_key text not null,
  bond_text text not null default '',
  cover_key text not null default 'mist',
  status text not null default 'pending',
  entry_generation text not null default '云',
  entry_no integer,
  is_public boolean not null default false,
  is_region_public boolean not null default true,
  is_story_public boolean not null default true,
  contact_text text not null default '',
  heat_value integer not null default 0,
  featured_level integer not null default 0,
  review_note text not null default '',
  internal_note text not null default '',
  reviewed_by_user_id uuid,
  reviewed_by_name text not null default '',
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint yunqi_roster_cards_dao_name_check check (left(dao_name, 1) = '云' and char_length(dao_name) between 2 and 3),
  constraint yunqi_roster_cards_identity_check check (identity_key in ('swordsman','healer','strategist','artisan','wanderer','guardian')),
  constraint yunqi_roster_cards_gender_check check (gender_key in ('male','female','unspecified')),
  constraint yunqi_roster_cards_bond_check check (bond_key in ('seeking','companion','mentor','quiet')),
  constraint yunqi_roster_cards_cover_check check (cover_key in ('mist','sword','bamboo','moon','gold','jade')),
  constraint yunqi_roster_cards_status_check check (status in ('pending','approved','deferred','rejected')),
  constraint yunqi_roster_cards_entry_generation_check check (length(trim(entry_generation)) > 0),
  constraint yunqi_roster_cards_entry_no_check check (entry_no is null or entry_no > 0),
  constraint yunqi_roster_cards_heat_check check (heat_value >= 0),
  constraint yunqi_roster_cards_featured_check check (featured_level >= 0 and featured_level <= 9)
);

-- 这里记录已经执行过的一次性迁移，避免重复执行脚本时覆盖后台手动调整。
create table if not exists public.yunqi_roster_schema_migrations (
  migration_key text primary key,
  applied_at timestamptz not null default timezone('utc', now())
);

-- 这里兼容已经存在的新版名帖表；旧版新表如果缺少入册编号和辈分字段，就补上。
alter table public.yunqi_roster_cards add column if not exists dao_name text not null default '云未名';
alter table public.yunqi_roster_cards add column if not exists entry_generation text not null default '云';
alter table public.yunqi_roster_cards add column if not exists entry_no integer;
alter table public.yunqi_roster_cards add column if not exists gender_key text not null default 'unspecified';
update public.yunqi_roster_cards
set dao_name = '云未名'
where dao_name is null
   or left(trim(dao_name), 1) <> '云'
   or char_length(trim(dao_name)) < 2
   or char_length(trim(dao_name)) > 3;
alter table public.yunqi_roster_cards alter column dao_name set default '云未名';
alter table public.yunqi_roster_cards alter column dao_name set not null;
alter table public.yunqi_roster_cards drop constraint if exists yunqi_roster_cards_dao_name_check;
alter table public.yunqi_roster_cards
add constraint yunqi_roster_cards_dao_name_check
check (left(dao_name, 1) = '云' and char_length(dao_name) between 2 and 3);
update public.yunqi_roster_cards
set entry_generation = '云'
where entry_generation is null or trim(entry_generation) = '';
update public.yunqi_roster_cards
set entry_generation = left(trim(entry_generation), 1)
where length(trim(entry_generation)) > 1;
alter table public.yunqi_roster_cards alter column entry_generation set default '云';
alter table public.yunqi_roster_cards alter column entry_generation set not null;
update public.yunqi_roster_cards
set gender_key = 'unspecified'
where gender_key is null or gender_key not in ('male','female','unspecified');
alter table public.yunqi_roster_cards drop constraint if exists yunqi_roster_cards_gender_check;
alter table public.yunqi_roster_cards
add constraint yunqi_roster_cards_gender_check
check (gender_key in ('male','female','unspecified'));
alter table public.yunqi_roster_cards drop constraint if exists yunqi_roster_cards_entry_generation_check;
alter table public.yunqi_roster_cards
add constraint yunqi_roster_cards_entry_generation_check
check (length(trim(entry_generation)) > 0);
alter table public.yunqi_roster_cards drop constraint if exists yunqi_roster_cards_entry_no_check;
alter table public.yunqi_roster_cards
add constraint yunqi_roster_cards_entry_no_check
check (entry_no is null or entry_no > 0);

-- 这里补救已入册但未公开的历史名帖，避免前台名册和人数统计漏掉新审核记录。
update public.yunqi_roster_cards
set is_public = true
where status = 'approved'
  and is_public is distinct from true;

-- 这里把公开开关补成稳定默认值，旧表如果曾经允许空值，也会被修正。
update public.yunqi_roster_cards
set is_public = false
where is_public is null;
alter table public.yunqi_roster_cards alter column is_public set default false;
alter table public.yunqi_roster_cards alter column is_public set not null;

-- 这里创建审核日志表，记录每次后台保存和状态变化。
create table if not exists public.yunqi_roster_card_review_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.yunqi_roster_cards(id) on delete cascade,
  action_type text not null default 'save',
  previous_status text check (previous_status in ('pending','approved','deferred','rejected')),
  next_status text not null check (next_status in ('pending','approved','deferred','rejected')),
  review_note text not null default '',
  reviewed_by_user_id uuid not null,
  reviewed_by_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 这里补齐索引，保证手机端搜索、筛选和后台审核更稳。
create index if not exists idx_yunqi_roster_cards_public on public.yunqi_roster_cards(status, is_public, featured_level, approved_at desc);
create index if not exists idx_yunqi_roster_cards_identity on public.yunqi_roster_cards(identity_key);
create index if not exists idx_yunqi_roster_cards_gender on public.yunqi_roster_cards(gender_key);
drop index if exists public.idx_yunqi_roster_cards_entry_no_unique;
create index if not exists idx_yunqi_roster_cards_created on public.yunqi_roster_cards(created_at desc);
create index if not exists idx_yunqi_roster_card_logs_card on public.yunqi_roster_card_review_logs(card_id, created_at desc);

-- 这里创建更新时间触发器，避免后台保存后时间不准。
drop trigger if exists trg_yunqi_roster_admin_profiles_updated_at on public.yunqi_roster_admin_profiles;
create trigger trg_yunqi_roster_admin_profiles_updated_at
before update on public.yunqi_roster_admin_profiles
for each row execute function public.set_yunqi_updated_at();

drop trigger if exists trg_yunqi_roster_cards_updated_at on public.yunqi_roster_cards;
create trigger trg_yunqi_roster_cards_updated_at
before update on public.yunqi_roster_cards
for each row execute function public.set_yunqi_updated_at();

-- 这里判断当前登录用户是否为有效名册执事。
create or replace function public.is_active_yunqi_roster_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.yunqi_roster_admin_profiles
    where user_id = auth.uid()
      and is_active = true
  );
$$;

-- 这里开启行级权限，防止匿名用户越权查看后台字段。
alter table public.yunqi_roster_admin_profiles enable row level security;
alter table public.yunqi_roster_cards enable row level security;
alter table public.yunqi_roster_card_review_logs enable row level security;

-- 这里允许管理员读取自己的资料。
drop policy if exists yunqi_admin_profiles_select_self on public.yunqi_roster_admin_profiles;
create policy yunqi_admin_profiles_select_self
on public.yunqi_roster_admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_active_yunqi_roster_admin());

-- 这里允许任何人提交名帖，但默认 pending 且不公开；前端提交后不会读取待审行，避免触发公开读取限制。
drop policy if exists yunqi_roster_cards_public_insert on public.yunqi_roster_cards;
create policy yunqi_roster_cards_public_insert
on public.yunqi_roster_cards
for insert
to anon, authenticated
with check (status = 'pending' and is_public = false);

-- 这里允许任何人读取已经入册的名帖；已入册即进入前台名册。
drop policy if exists yunqi_roster_cards_public_select on public.yunqi_roster_cards;
create policy yunqi_roster_cards_public_select
on public.yunqi_roster_cards
for select
to anon, authenticated
using (status = 'approved' or public.is_active_yunqi_roster_admin());

-- 这里允许管理员更新名帖。
drop policy if exists yunqi_roster_cards_admin_update on public.yunqi_roster_cards;
create policy yunqi_roster_cards_admin_update
on public.yunqi_roster_cards
for update
to authenticated
using (public.is_active_yunqi_roster_admin())
with check (public.is_active_yunqi_roster_admin());

-- 这里允许管理员删除无效名帖。
drop policy if exists yunqi_roster_cards_admin_delete on public.yunqi_roster_cards;
create policy yunqi_roster_cards_admin_delete
on public.yunqi_roster_cards
for delete
to authenticated
using (public.is_active_yunqi_roster_admin());

-- 这里允许管理员写入审核日志。
drop policy if exists yunqi_roster_card_logs_admin_insert on public.yunqi_roster_card_review_logs;
create policy yunqi_roster_card_logs_admin_insert
on public.yunqi_roster_card_review_logs
for insert
to authenticated
with check (public.is_active_yunqi_roster_admin());

-- 这里允许管理员读取审核日志。
drop policy if exists yunqi_roster_card_logs_admin_select on public.yunqi_roster_card_review_logs;
create policy yunqi_roster_card_logs_admin_select
on public.yunqi_roster_card_review_logs
for select
to authenticated
using (public.is_active_yunqi_roster_admin());

-- 这里提供旧名册一次性迁移桥：如果旧表存在，就尽量映射到新版名帖表。
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'yunqi_roster_entries'
  ) then
    insert into public.yunqi_roster_cards (
      public_slug,
      jianghu_name,
      dao_name,
      title_name,
      identity_key,
      gender_key,
      region_text,
      motto,
      story_text,
      skill_tags,
      bond_key,
      bond_text,
      cover_key,
      status,
      entry_generation,
      entry_no,
      is_public,
      is_region_public,
      is_story_public,
      contact_text,
      heat_value,
      featured_level,
      review_note,
      internal_note,
      approved_at,
      created_at,
      updated_at
    )
    select
      coalesce(nullif(public_slug, ''), 'legacy-' || id::text),
      coalesce(nullif(daohao, ''), nullif(secular_name, ''), '旧名册同门'),
      '云未名',
      coalesce(nullif(secular_name, ''), '待补真实姓名'),
      case
        when coalesce(position_key, '') in ('yunsi_wen') then 'strategist'
        when coalesce(position_key, '') in ('yunsi_shi') then 'guardian'
        when coalesce(position_key, '') in ('yunsi_cai') then 'artisan'
        else 'wanderer'
      end,
      case
        when lower(coalesce(gender, '')) = 'male' then 'male'
        when lower(coalesce(gender, '')) = 'female' then 'female'
        else 'unspecified'
      end,
      coalesce(nullif(current_city, ''), '云深不知处'),
      coalesce(nullif(entry_intent, ''), '旧册有名，今朝重归云栖。'),
      coalesce(nullif(strengths, ''), nullif(hobbies, ''), '此名帖由旧名册迁移而来，更多故事待同门补写。'),
      array_remove(array[
        nullif(profession, ''),
        nullif(referrer_name, ''),
        case when array_length(free_time_slots, 1) > 0 then '旧册迁移' else null end
      ], null),
      'quiet',
      coalesce(nullif(hobbies, ''), '由旧名册迁移，羁绊状态待补充。'),
      'mist',
      case when status in ('pending','approved','deferred','rejected') then status else 'pending' end,
      '云',
      case when entry_no is not null and entry_no > 0 then entry_no else null end,
      case when status = 'approved' then true else false end,
      true,
      true,
      trim(coalesce(wechat_id, '') || ' ' || coalesce(social_xiaohongshu_douyin, '') || ' ' || coalesce(social_qq, '') || ' ' || coalesce(social_other, '')),
      0,
      0,
      coalesce(review_comment, ''),
      '由旧表 yunqi_roster_entries 迁移。旧俗家姓名：' || coalesce(secular_name, '') || '；旧堂口：' || coalesce(hall_key, '') || '；旧生年：' || coalesce(birth_year, '') || '。',
      case when status = 'approved' then coalesce(reviewed_at, updated_at, created_at) else null end,
      coalesce(created_at, timezone('utc', now())),
      coalesce(updated_at, timezone('utc', now()))
    from public.yunqi_roster_entries
    on conflict (public_slug) do nothing;

    -- 这里补救已经迁移过的旧数据：如果真实姓名字段仍是旧默认值，就从旧表 secular_name 安全回填。
    update public.yunqi_roster_cards as card
    set title_name = public.clean_yunqi_roster_legacy_text(old_entry.secular_name),
        internal_note = trim(card.internal_note || '；已从旧表回填真实姓名。')
    from public.yunqi_roster_entries as old_entry
    where card.public_slug = coalesce(nullif(old_entry.public_slug, ''), 'legacy-' || old_entry.id::text)
      and public.clean_yunqi_roster_legacy_text(old_entry.secular_name) <> ''
      and card.title_name in ('云栖旧友', '云栖同门', '待补真实姓名');

    -- 这里补救已经迁移过的旧数据：如果新版性别仍未选择，就从旧表 gender 安全回填。
    update public.yunqi_roster_cards as card
    set gender_key = case
          when lower(coalesce(old_entry.gender, '')) = 'male' then 'male'
          when lower(coalesce(old_entry.gender, '')) = 'female' then 'female'
          else 'unspecified'
        end,
        internal_note = trim(card.internal_note || '；已从旧表回填性别。')
    from public.yunqi_roster_entries as old_entry
    where card.public_slug = coalesce(nullif(old_entry.public_slug, ''), 'legacy-' || old_entry.id::text)
      and card.gender_key = 'unspecified'
      and lower(coalesce(old_entry.gender, '')) in ('male','female');
  end if;
end;
$$;

-- 这里给已经登记的名帖按性别补发云字道名，避免把江湖名和道名混在一起。
do $$
declare
  card_record record;
  male_first text[] := array['霄','岳','川','衡','柏','舟','峥','朔','玄','砚','松','庭','修','凌','昭'];
  female_first text[] := array['岚','汐','瑶','芷','棠','笙','蘅','霁','绾','梨','婉','玥','晴','棂','姝'];
  neutral_first text[] := array['和','澄','溪','竹','白','安','知','念','临','望','星','言','归','明','初'];
  suffix_pool text[] := array['清','澈','宁','安','行','远','明','照','初','然','舟','川','月','岑','微','白','庭','归','知','吟'];
  first_pool text[];
  first_index integer;
  suffix_index integer;
begin
  if not exists (
    select 1
    from public.yunqi_roster_schema_migrations
    where migration_key = '20260427_assign_cloud_dao_names_v1'
  ) then
    for card_record in
      select
        id,
        gender_key,
        row_number() over (
          partition by case when gender_key in ('male','female') then gender_key else 'unspecified' end
          order by coalesce(approved_at, created_at), created_at, id
        ) as gender_rank
      from public.yunqi_roster_cards
      order by coalesce(approved_at, created_at), created_at, id
    loop
      first_pool := case
        when card_record.gender_key = 'male' then male_first
        when card_record.gender_key = 'female' then female_first
        else neutral_first
      end;

      first_index := ((((card_record.gender_rank - 1)::integer) / array_length(suffix_pool, 1)) % array_length(first_pool, 1)) + 1;
      suffix_index := (((card_record.gender_rank - 1)::integer) % array_length(suffix_pool, 1)) + 1;

      update public.yunqi_roster_cards
      set dao_name = '云' || first_pool[first_index] || suffix_pool[suffix_index],
          entry_generation = '云'
      where id = card_record.id;
    end loop;

    insert into public.yunqi_roster_schema_migrations (migration_key)
    values ('20260427_assign_cloud_dao_names_v1');
  end if;
end;
$$;

-- 这里按现有入册顺序重新排列正式入册编号，重新加回含 4 的数字。
do $$
declare
  card_record record;
  next_entry_no integer := 1;
begin
  if not exists (
    select 1
    from public.yunqi_roster_schema_migrations
    where migration_key = '20260427_resequence_entry_code_v1'
  ) then
    for card_record in
      select id
      from public.yunqi_roster_cards
      where status = 'approved'
      order by coalesce(approved_at, created_at), created_at, id
    loop
      update public.yunqi_roster_cards
      set entry_generation = '云',
          entry_no = next_entry_no
      where id = card_record.id;

      next_entry_no := next_entry_no + 1;
    end loop;

    insert into public.yunqi_roster_schema_migrations (migration_key)
    values ('20260427_resequence_entry_code_v1');
  end if;
end;
$$;

-- 这里补齐道名和新编号唯一索引，避免后台误把两位同门改成同一个道名或同一个入册号。
create unique index if not exists idx_yunqi_roster_cards_dao_name_unique on public.yunqi_roster_cards(dao_name);
create unique index if not exists idx_yunqi_roster_cards_entry_generation_no_unique on public.yunqi_roster_cards(entry_generation, entry_no) where entry_no is not null;

-- 这里给管理员创建语句模板，替换邮箱和用户编号后执行即可。
-- insert into public.yunqi_roster_admin_profiles (user_id, email, display_name, role, is_active)
-- values ('替换为 auth.users.id', 'admin@example.com', '云栖执事', '名册执事', true)
-- on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name, role = excluded.role, is_active = excluded.is_active;


