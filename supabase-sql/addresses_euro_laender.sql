-- White Class Pro: Lieferadressen im Euroraum statt nur Deutschland
-- Einmal ausführen: Supabase Dashboard -> SQL Editor -> New query -> einfügen -> Run.
-- Ändert nur die Prüfregeln der Tabelle public.addresses (Land und Postleitzahl), keine Daten.
-- Das Skript kann gefahrlos mehrfach laufen und tut nichts, wenn die Tabelle noch nicht existiert.
--
-- Vorher galt: country = 'DE' und Postleitzahl = genau 5 Ziffern.
-- Jetzt gilt:  country ist ein Euro-Land (Liste unten, gleiche wie in shipping.json), und die
--              Postleitzahl darf 3-10 Zeichen aus Buchstaben, Ziffern, Leerzeichen und Bindestrich
--              haben (die genaue Länderprüfung macht die Website).
--
-- Neues Land später aufnehmen: hier UND in shipping.json ergänzen, Skript erneut ausführen.

do $$
declare
  r record;
begin
  if to_regclass('public.addresses') is null then
    raise notice 'Tabelle public.addresses existiert noch nicht - zuerst addresses.sql ausführen.';
    return;
  end if;

  -- alte Regeln für Land und Postleitzahl entfernen, egal wie sie heißen
  for r in
    select conname from pg_constraint
    where conrelid = 'public.addresses'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%country%' or pg_get_constraintdef(oid) like '%postal_code%')
  loop
    execute format('alter table public.addresses drop constraint %I', r.conname);
  end loop;

  alter table public.addresses add constraint addresses_country_check
    check (country in ('AT','BE','BG','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK'));

  alter table public.addresses add constraint addresses_postal_code_check
    check (postal_code ~ '^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$');
end $$;
