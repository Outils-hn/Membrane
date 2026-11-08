-- Membrane 1.9 : a coller UNE fois dans Supabase (projet Index) > SQL Editor > Run.
-- Partage la colle d'origine avec l'equipe (elle fait maintenant partie de la bibliotheque).
-- Sans ce script, Membrane marche quand meme : la colle d'origine est simplement « sur ce poste seulement ».
-- Peut etre relance sans risque.
insert into public.membrane_catalogue (id, data) values
  ('colle444', '{"id": "colle444", "type": "colle", "nom": "SikaBond-444 Membrane Fix", "court": "SikaBond-444", "fournisseur": "Sika", "ml": 600, "metres": 10, "metresMin": 7.5, "parCarton": 20, "cordonMm": 45}'::jsonb)
on conflict (id) do nothing;
