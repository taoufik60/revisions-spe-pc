-- PC Lab v2 · mise à jour 3 : masquer des parties d'un chapitre, classe par classe
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
