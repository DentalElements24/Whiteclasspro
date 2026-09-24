-- Bestellhistorie fürs Kundenkonto (konto.html, Tab "Meine Bestellungen").
-- Einmal im Supabase-Dashboard unter SQL Editor ausführen.
--
-- Geschrieben wird diese Tabelle ausschließlich vom Stripe-Webhook (api/webhook.js) mit dem
-- Service-Role-Key, der Row Level Security umgeht. Kunden können ihre eigenen Bestellungen nur
-- LESEN (über ihren normalen Login-Token) — es gibt bewusst keine Insert/Update/Delete-Policy für
-- angemeldete Nutzer, damit niemand sich selbst eine Bestellung "eintragen" kann.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  status text not null default 'paid',
  amount_total integer not null,
  currency text not null default 'eur',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Nutzer lesen eigene Bestellungen" on public.orders;
create policy "Nutzer lesen eigene Bestellungen"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);
