-- ============================================================
-- Raja Founder: Supabase schema
-- Run this whole file once in Supabase -> SQL Editor -> New query.
-- Before running: replace YOUR_ADMIN_EMAIL (last section) with the email
-- of the admin user you create under Authentication -> Users.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- admins ----------
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- no policies: not readable from the browser

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- pop-up settings (one row) ----------
create table if not exists public.popup_settings (
  id            int primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  brand         text not null default 'RAJA FOUNDER',
  title         text not null default 'Share your founder story',
  subtitle      text not null default 'Know a founder who deserves to be featured? Tell us and we will get back to you.',
  name_label    text not null default 'Your name',
  email_label   text not null default 'Email address',
  message_label text not null default 'Your message',
  button_text   text not null default 'Send',
  success_text  text not null default 'Thank you! We will be in touch soon.',
  footer_text   text not null default 'We read every message.',
  delay_seconds int  not null default 8  check (delay_seconds between 0 and 600),
  repeat_days   int  not null default 7  check (repeat_days between 0 and 365),
  updated_at    timestamptz not null default now()
);
insert into public.popup_settings (id) values (1) on conflict do nothing;

-- ---------- pop-up submissions ----------
create table if not exists public.popup_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message    text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

-- ---------- newsletter ----------
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
create unique index if not exists newsletter_email_uniq on public.newsletter_subscribers (lower(email));

-- ---------- featured founders section ----------
create table if not exists public.featured_settings (
  id       int primary key default 1 check (id = 1),
  headline text not null default '0 founders on file, $0 in tracked annual revenue, $0 in exits',
  total    int  not null default 0 check (total >= 0)
);
insert into public.featured_settings (id) values (1) on conflict do nothing;

create table if not exists public.featured_founders (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('top', 'more')),
  name       text not null default '',
  company    text not null default '',
  revenue    text not null default '',
  link       text not null default '' check (link = '' or link ~* '^https?://'),
  photo_url  text not null default '',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- founders by region ----------
create table if not exists public.regions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  founder_count int  not null default 0 check (founder_count >= 0),
  sort_order    int  not null default 0
);
insert into public.regions (name, founder_count, sort_order)
select * from (values ('Asia',312,1),('Europe',186,2),('North America',141,3),('Africa',86,4),('South America & Oceania',59,5)) v(n,c,o)
where not exists (select 1 from public.regions);

-- ---------- row level security ----------
alter table public.popup_settings         enable row level security;
alter table public.popup_submissions      enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.featured_settings      enable row level security;
alter table public.featured_founders      enable row level security;
alter table public.regions                enable row level security;

-- visitors may READ the public content
create policy "public read" on public.popup_settings    for select to anon, authenticated using (true);
create policy "public read" on public.featured_settings for select to anon, authenticated using (true);
create policy "public read" on public.featured_founders for select to anon, authenticated using (true);
create policy "public read" on public.regions           for select to anon, authenticated using (true);

-- visitors may only ADD a message / subscription (never read them back)
create policy "visitor insert" on public.popup_submissions      for insert to anon, authenticated with check (true);
create policy "visitor insert" on public.newsletter_subscribers for insert to anon, authenticated with check (true);

-- the admin can do everything
create policy "admin all" on public.popup_settings         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.popup_submissions      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.newsletter_subscribers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.featured_settings      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.featured_founders      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.regions                for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- table privileges (RLS above still decides which rows)
grant select on public.popup_settings, public.featured_settings, public.featured_founders, public.regions to anon;
grant insert on public.popup_submissions, public.newsletter_subscribers to anon;
grant all on all tables in schema public to authenticated;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public) values ('featured', 'featured', true) on conflict (id) do nothing;
create policy "admin upload featured" on storage.objects for insert to authenticated
  with check (bucket_id = 'featured' and public.is_admin());
create policy "admin update featured" on storage.objects for update to authenticated
  using (bucket_id = 'featured' and public.is_admin());
create policy "admin delete featured" on storage.objects for delete to authenticated
  using (bucket_id = 'featured' and public.is_admin());
-- (the bucket is public, so photos load by URL without a read policy)

-- ---------- YOUR ADMIN ----------
insert into public.admins (email) values ('marketerraja11@gmail.com') on conflict do nothing;
