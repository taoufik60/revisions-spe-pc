-- PC Lab v2 · mise à jour 3 : masquer des parties d'un chapitre, et page « Activité » du prof
-- À coller une seule fois dans Supabase > SQL Editor, puis « Run ».

create table if not exists classe_parties_masquees (
  classe_id uuid not null references classes(id) on delete cascade,
  slug      text not null,
  primary key (classe_id, slug)
);
alter table classe_parties_masquees enable row level security;

drop policy if exists parties_prof on classe_parties_masquees;
create policy parties_prof on classe_parties_masquees for all to authenticated
  using (est_prof_de(classe_id)) with check (est_prof_de(classe_id));
drop policy if exists parties_eleve on classe_parties_masquees;
create policy parties_eleve on classe_parties_masquees for select to authenticated
  using (classe_id = (select classe_id from eleves where user_id = auth.uid()));

grant select, insert, delete on classe_parties_masquees to authenticated;
revoke all on classe_parties_masquees from anon;

-- Activité des élèves (page « Activité » du prof) : par élève, jour et chapitre,
-- temps de travail estimé, nombre de cartes faites et heure de la dernière réponse.
-- Temps : chaque réponse compte pour le temps écoulé jusqu'à la suivante, 2 minutes au plus ;
-- après une pause de plus de 5 minutes (ou en fin de séance), on compte 20 secondes.
create or replace function prof_activite(p_classe uuid)
returns table (eleve_id uuid, jour date, chapitre int, secondes int, cartes int, derniere timestamptz)
language sql stable security definer set search_path = public as $$
  with r as (
    select x.eleve_id, x.carte_id, x.cree_le,
           lead(x.cree_le) over (partition by x.eleve_id order by x.cree_le) as suivante
      from carte_reponses x join eleves e on e.id = x.eleve_id
     where e.classe_id = p_classe and est_prof_de(p_classe))
  select eleve_id, (cree_le at time zone 'Europe/Paris')::date,
         coalesce(substring(carte_id from '^ch(\d+)-')::int, 0),
         sum(case when suivante is null or suivante - cree_le > interval '5 minutes' then 20
                  else least(extract(epoch from suivante - cree_le), 120) end)::int,
         count(*)::int, max(cree_le)
    from r group by 1, 2, 3;
$$;
revoke all on function prof_activite(uuid) from public, anon;
grant execute on function prof_activite(uuid) to authenticated;
