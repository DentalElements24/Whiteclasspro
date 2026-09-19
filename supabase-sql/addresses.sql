-- White Class Pro: Adressen der Kunden
-- Einmalig ausführen: Supabase Dashboard -> SQL Editor -> New query -> einfügen -> Run.
-- Danach sieht und ändert jeder angemeldete Kunde nur seine eigenen Adressen (Row Level Security).

create table if not exists public.addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- main = Hauptadresse, shipping = abweichende Lieferadresse, billing = abweichende Rechnungsadresse
  kind          text not null check (kind in ('main', 'shipping', 'billing')),
  first_name    text not null check (char_length(first_name) between 1 and 60),
  last_name     text not null check (char_length(last_name) between 1 and 60),
  company       text          check (char_length(company) <= 100),
  street        text not null check (char_length(street) between 1 and 120),
  address_extra text          check (char_length(address_extra) <= 120),
  postal_code   text not null check (postal_code ~ '^[0-9]{5}$'),
  city          text not null check (char_length(city) between 1 and 80),
  country       text not null default 'DE' check (country = 'DE'),
  phone         text          check (char_length(phone) <= 30),
  updated_at    timestamptz not null default now(),
  unique (user_id, kind)
);

alter table public.addresses enable row level security;

-- Nicht angemeldete Besucher (anon) dürfen nichts sehen oder ändern.
revoke all on public.addresses from anon;

drop policy if exists "addresses_select_own" on public.addresses;
drop policy if exists "addresses_insert_own" on public.addresses;
drop policy if exists "addresses_update_own" on public.addresses;
drop policy if exists "addresses_delete_own" on public.addresses;

create policy "addresses_select_own" on public.addresses
  for select to authenticated using (user_id = (select auth.uid()));

create policy "addresses_insert_own" on public.addresses
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "addresses_update_own" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "addresses_delete_own" on public.addresses
  for delete to authenticated using (user_id = (select auth.uid()));

-- Änderungszeitpunkt automatisch pflegen
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();
