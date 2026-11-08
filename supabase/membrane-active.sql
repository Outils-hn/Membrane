-- Membrane 1.10 : a coller UNE fois dans Supabase (projet Index) > SQL Editor > Run.
-- Ajoute Active+, Active SB+ et Active FSB+, et corrige la Universal SB : elle n'est autocollante que sur UNE face,
-- l'autre face se colle (donc un cordon de colle de moins, pas aucun). Peut etre relance sans risque.

insert into public.membrane_catalogue (id, data) values
  ('acplus', '{"id": "acplus", "nom": "SikaMembran Active+", "court": "Active+", "fournisseur": "Sika", "role": "freine-vapeur", "largeurs": [100, 150, 200, 250, 300, 1500], "surDemande": [250, 300], "rouleauM": 25, "sd": "0,5 à 20"}'::jsonb),
  ('acsb', '{"id": "acsb", "nom": "SikaMembran Active SB+", "court": "Active SB+", "fournisseur": "Sika", "role": "freine-vapeur, une face autocollante", "largeurs": [100, 150, 200], "surDemande": [], "rouleauM": 25, "sd": "0,5 à 20", "autocollant": "face"}'::jsonb),
  ('acfsb', '{"id": "acfsb", "nom": "SikaMembran Active FSB+", "court": "Active FSB+", "fournisseur": "Sika", "role": "freine-vapeur, autocollante", "largeurs": [80, 100, 150, 200, 250, 300, 350], "surDemande": [], "rouleauM": 25, "sd": "0,5 à 20", "autocollant": true}'::jsonb)
on conflict (id) do nothing;

-- Universal SB : une face autocollante
update public.membrane_catalogue
set data = data || '{"autocollant": "face", "role": "une face autocollante"}'::jsonb, updated_at = now()
where id = 'unisb' and (data->>'autocollant') is distinct from 'face';
