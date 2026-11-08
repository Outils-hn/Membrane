-- Membrane 1.8 : a coller UNE fois dans Supabase (projet Index) > SQL Editor > Run.
-- Ajoute la SikaMembran Universal SB (autocollante), la valeur sd de Universal et d'Outdoor plus,
-- et retire la SikaMembran Outdoor (non vendue en Suisse). Peut etre relance sans risque.

-- 1) Universal SB (ajoutee seulement si elle n'existe pas)
insert into public.membrane_catalogue (id, data) values
  ('unisb', '{"id": "unisb", "nom": "SikaMembran Universal SB", "court": "Universal SB", "fournisseur": "Sika", "role": "autocollante", "largeurs": [100, 150, 200, 250, 350], "surDemande": [250, 350], "rouleauM": 25, "sd": 60, "autocollant": true}'::jsonb)
on conflict (id) do nothing;

-- 2) Valeur sd (en m) des deux produits deja la
update public.membrane_catalogue set data = data || '{"sd": 4}'::jsonb, updated_at = now() where id = 'outplus' and not (data ? 'sd');
update public.membrane_catalogue set data = data || '{"sd": 60}'::jsonb, updated_at = now() where id = 'uni' and not (data ? 'sd');

-- 3) Retrait de la SikaMembran Outdoor (mise a la corbeille, comme le bouton « Retirer pour l'equipe »)
update public.membrane_catalogue set deleted_at = now(), updated_at = now() where id = 'out' and deleted_at is null;
