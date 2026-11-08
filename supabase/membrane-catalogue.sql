-- Catalogue commun de Membrane : a coller UNE FOIS dans Supabase (projet Index, le meme que Strate)
-- > SQL Editor > New query > colle le CONTENU de ce fichier > Run. Relancer le script ne casse rien.
--
-- - Une table « membrane_catalogue » : un produit (membrane) par ligne : nom, fournisseur, role, largeurs
--   en stock et sur demande, longueur du rouleau, lien vers la fiche technique d'Index.
-- - Lecture libre (pas de prix dans ce catalogue) ; envoi et retrait : compte Index valide
--   (meme controle que Strate : fonction public._check_acces(), creee par strate-comptes.sql).
-- - Un retrait met le produit a la corbeille (deleted_at) : les postes qui l'utilisent dans une commande le gardent.
-- - Les 3 produits Sika d'origine sont deja dans le catalogue pour tout le monde.

create table if not exists public.membrane_catalogue (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.membrane_catalogue enable row level security;
grant select on public.membrane_catalogue to anon, authenticated;
grant all on public.membrane_catalogue to service_role;
drop policy if exists "lecture catalogue membrane" on public.membrane_catalogue;
create policy "lecture catalogue membrane" on public.membrane_catalogue for select to anon, authenticated using (true);

create or replace function public.membrane_save_item(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; v_id text := p->>'id';
begin
  e := public._check_acces();
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  if coalesce(v_id, '') = '' or length(v_id) > 100 then return jsonb_build_object('ok', false, 'error', 'Produit invalide.'); end if;
  if coalesce(trim(p->>'nom'), '') = '' then return jsonb_build_object('ok', false, 'error', 'Le nom est obligatoire.'); end if;
  if jsonb_typeof(p->'largeurs') is distinct from 'array' or jsonb_array_length(p->'largeurs') = 0 then
    return jsonb_build_object('ok', false, 'error', 'Indiquez au moins une largeur.');
  end if;
  if octet_length(p::text) > 20000 then return jsonb_build_object('ok', false, 'error', 'Produit trop volumineux.'); end if;
  insert into public.membrane_catalogue (id, data, updated_at, deleted_at) values (v_id, p, now(), null)
  on conflict (id) do update set data = excluded.data, updated_at = now(), deleted_at = null;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.membrane_delete_item(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  e := public._check_acces();
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  update public.membrane_catalogue set deleted_at = now(), updated_at = now() where id = p_id;
  -- Corbeille videe apres 90 jours
  delete from public.membrane_catalogue where deleted_at < now() - interval '90 days';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.membrane_save_item(jsonb), public.membrane_delete_item(text) from public;
grant execute on function public.membrane_save_item(jsonb), public.membrane_delete_item(text) to anon, authenticated;

-- Produits d'origine (Sika) : ajoutes seulement s'ils n'existent pas deja
insert into public.membrane_catalogue (id, data) values
  ('outplus', '{"id": "outplus", "nom": "SikaMembran Outdoor plus", "court": "Outdoor plus", "fournisseur": "Sika", "role": "pare-pluie", "largeurs": [100, 150, 200, 250, 300, 1400], "surDemande": [1400], "rouleauM": 25}'::jsonb),
  ('uni', '{"id": "uni", "nom": "SikaMembran Universal", "court": "Universal", "fournisseur": "Sika", "role": "pare-vapeur", "largeurs": [100, 150, 200, 250, 300, 350, 1400], "surDemande": [1400], "rouleauM": 25}'::jsonb)
on conflict (id) do nothing;
