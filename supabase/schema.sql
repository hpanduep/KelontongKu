-- =====================================================================
-- KelontongKu - skema Supabase (data per user, dilindungi RLS)
-- Jalankan sekali di: Supabase Dashboard -> SQL Editor -> New query
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- Trigger umum untuk mengisi updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- PRODUK ----------
create table if not exists public.products (
  user_id    uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  id         text    not null,
  name       text    not null,
  price      numeric not null default 0,
  stock      numeric not null default 0,
  category   text    not null check (category in ('kelontong', 'warung')),
  barcode    text,
  image      text,
  sort_key   bigint  not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- TRANSAKSI ----------
create table if not exists public.transactions (
  user_id        uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  id             text    not null,
  date           timestamptz not null,
  formatted_date text    not null,
  items          jsonb   not null default '[]'::jsonb,
  subtotal       numeric not null default 0,
  discount       numeric not null default 0,
  final_payment  numeric not null default 0,
  cash_given     numeric not null default 0,
  change_amount  numeric not null default 0,
  is_kasbon      boolean not null default false,
  customer_name  text,
  profile        text    not null check (profile in ('kelontong', 'warung')),
  sort_key       bigint  not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- KASBON ----------
create table if not exists public.kasbon (
  user_id       uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  id            text    not null,
  trx_id        text    not null,
  customer_name text    not null,
  date          text    not null,
  amount        numeric not null default 0,
  is_paid       boolean not null default false,
  items_summary text    not null default '',
  sort_key      bigint  not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- PENGATURAN (1 baris per user) ----------
create table if not exists public.settings (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  store_name    text not null default '',
  toko_prefix   text not null default 'TOKO',
  warung_prefix text not null default 'DAPOER',
  printer_width text not null default '58mm',
  updated_at    timestamptz not null default now()
);

-- Index untuk urutan tampil (terbaru di atas)
create index if not exists products_user_sort_idx     on public.products     (user_id, sort_key desc);
create index if not exists transactions_user_sort_idx on public.transactions (user_id, sort_key desc);
create index if not exists kasbon_user_sort_idx       on public.kasbon       (user_id, sort_key desc);

-- Trigger updated_at
do $$
declare t text;
begin
  foreach t in array array['products', 'transactions', 'kasbon', 'settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- ROW LEVEL SECURITY ----------
-- Tiap user hanya bisa melihat / mengubah barisnya sendiri.
do $$
declare t text;
begin
  foreach t in array array['products', 'transactions', 'kasbon', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format(
      'create policy "owner_all" on public.%I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
