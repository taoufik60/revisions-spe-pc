-- PC Lab — mise à jour n° 1 : une carte ne monte de boîte que si elle était à revoir.
-- À coller une fois dans Supabase > SQL Editor, puis « Run ».

create or replace function repondre_carte(p_carte_id text, p_reponse int)
returns carte_suivi
language plpgsql security definer set search_path = public as $$
declare
  e     uuid := current_eleve_id();
  r     carte_suivi;
  jours int[] := array[1, 3, 7, 15, 30];
  auj   date := (now() at time zone 'Europe/Paris')::date;
begin
  if e is null then raise exception 'Réservé aux élèves connectés'; end if;
  if p_reponse not in (0, 1, 2) then raise exception 'Réponse invalide'; end if;
  insert into carte_suivi (eleve_id, carte_id) values (e, p_carte_id) on conflict do nothing;
  select * into r from carte_suivi where eleve_id = e and carte_id = p_carte_id for update;
  -- Un « Oui » ne fait monter la carte que si elle était à revoir (ou jamais vue) :
  -- refaire un paquet plusieurs fois le même jour ne rend pas une carte « acquise ».
  if p_reponse = 2 then
    if r.nb_reponses = 0 or r.prochaine <= auj then
      r.boite := least(r.boite + 1, 5); r.a_consolider := false; r.prochaine := auj + jours[r.boite];
    end if;
  elsif p_reponse = 1 then
    r.prochaine := auj + 1;
  else
    r.boite := greatest(r.boite - 1, 1); r.a_consolider := true; r.prochaine := auj + 1;
  end if;
  update carte_suivi
     set boite = r.boite, a_consolider = r.a_consolider, prochaine = r.prochaine,
         nb_reponses = nb_reponses + 1, derniere_reponse = now()
   where eleve_id = e and carte_id = p_carte_id
  returning * into r;
  insert into carte_reponses (eleve_id, carte_id, reponse) values (e, p_carte_id, p_reponse);
  return r;
end $$;
