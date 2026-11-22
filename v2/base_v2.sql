-- =====================================================================
-- PC Lab v2 — suivi des flashcards (boîtes de Leitner)
-- À coller une seule fois dans Supabase > SQL Editor, puis « Run ».
-- Ne modifie aucune table existante : les comptes élèves, les classes
-- et les chapitres ouverts (classe_chapitres) sont réutilisés.
-- =====================================================================

-- 1. Suivi de chaque carte, pour chaque élève
create table if not exists carte_suivi (
  eleve_id         uuid        not null references eleves(id) on delete cascade,
  carte_id         text        not null,              -- ex. 'ch5-p1-lois-de-newton-06'
  boite            smallint    not null default 1 check (boite between 1 and 5),
  a_consolider     boolean     not null default false, -- true après un « Non », jusqu'au prochain « Oui »
  prochaine        date        not null default current_date,
  nb_reponses      integer     not null default 0,
  derniere_reponse timestamptz,
  primary key (eleve_id, carte_id)
);

-- 2. Journal des réponses (séances, statistiques professeur)
create table if not exists carte_reponses (
  id        bigserial   primary key,
  eleve_id  uuid        not null references eleves(id) on delete cascade,
  carte_id  text        not null,
  reponse   smallint    not null check (reponse in (0, 1, 2)), -- 0 Non, 1 À moitié, 2 Oui
  cree_le   timestamptz not null default now()
);
create index if not exists carte_reponses_eleve_date on carte_reponses (eleve_id, cree_le);

-- 3. Sécurité : un élève ne lit que ses lignes ; un professeur lit tout.
alter table carte_suivi    enable row level security;
alter table carte_reponses enable row level security;

drop policy if exists carte_suivi_lecture on carte_suivi;
create policy carte_suivi_lecture on carte_suivi for select to authenticated
  using (eleve_id = current_eleve_id() or exists (select 1 from profs where profs.id = auth.uid()));

drop policy if exists carte_reponses_lecture on carte_reponses;
create policy carte_reponses_lecture on carte_reponses for select to authenticated
  using (eleve_id = current_eleve_id() or exists (select 1 from profs where profs.id = auth.uid()));
-- Aucune écriture directe : tout passe par la fonction ci-dessous.

-- 4. Enregistrer une réponse et appliquer les règles des boîtes
--    Oui      : la carte monte d'une boîte (5 au maximum), revient après 1/3/7/15/30 jours
--    À moitié : la carte reste dans sa boîte, revient le lendemain
--    Non      : la carte recule d'une boîte (1 au minimum), revient le lendemain,
--               et reste « à consolider » jusqu'au prochain « Oui »
create or replace function repondre_carte(p_carte_id text, p_reponse int)
returns carte_suivi
language plpgsql security definer set search_path = public as $$
declare
  e      uuid := current_eleve_id();
  r      carte_suivi;
  jours  int[] := array[1, 3, 7, 15, 30];
  auj    date := (now() at time zone 'Europe/Paris')::date;
begin
  if e is null then raise exception 'Réservé aux élèves connectés'; end if;
  if p_reponse not in (0, 1, 2) then raise exception 'Réponse invalide'; end if;

  insert into carte_suivi (eleve_id, carte_id) values (e, p_carte_id)
  on conflict (eleve_id, carte_id) do nothing;

  select * into r from carte_suivi where eleve_id = e and carte_id = p_carte_id for update;

  if p_reponse = 2 then
    r.boite := least(r.boite + 1, 5);
    r.a_consolider := false;
    r.prochaine := auj + jours[r.boite];
  elsif p_reponse = 1 then
    r.prochaine := auj + 1;
  else
    r.boite := greatest(r.boite - 1, 1);
    r.a_consolider := true;
    r.prochaine := auj + 1;
  end if;

  update carte_suivi
     set boite = r.boite, a_consolider = r.a_consolider, prochaine = r.prochaine,
         nb_reponses = nb_reponses + 1, derniere_reponse = now()
   where eleve_id = e and carte_id = p_carte_id
  returning * into r;

  insert into carte_reponses (eleve_id, carte_id, reponse) values (e, p_carte_id, p_reponse);
  return r;
end $$;

-- 5. Séances de la semaine : jours (lundi → dimanche) avec au moins 5 réponses
create or replace function seances_semaine()
returns integer
language sql security definer set search_path = public stable as $$
  select count(*)::int from (
    select (cree_le at time zone 'Europe/Paris')::date as jour
      from carte_reponses
     where eleve_id = current_eleve_id()
       and (cree_le at time zone 'Europe/Paris')::date >= date_trunc('week', (now() at time zone 'Europe/Paris'))::date
     group by 1
    having count(*) >= 5
  ) j;
$$;

grant execute on function repondre_carte(text, int) to authenticated;
grant execute on function seances_semaine() to authenticated;

-- =====================================================================
-- ESPACE PROFESSEUR
-- =====================================================================

-- 6. Message du professeur (affiché sur l'accueil des élèves), objectif de
--    séances par semaine, et prénom facultatif (visible du professeur).
alter table classes add column if not exists message text;
alter table classes add column if not exists message_le timestamptz;
alter table classes add column if not exists objectif_seances smallint not null default 3;
alter table eleves  add column if not exists prenom text;

-- 7. Le professeur propriétaire d'une classe
create or replace function est_prof_de(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from classes where id = p_classe and prof_id = auth.uid()) $$;

-- 8. Tableau des élèves : dernière activité, séances des 4 dernières semaines,
--    cartes vues / acquises / à consolider
create or replace function prof_eleves(p_classe uuid)
returns table (eleve_id uuid, identifiant text, prenom text, actif boolean, derniere timestamptz,
               jours_7 int, s0 int, s1 int, s2 int, s3 int, vues int, acquises int, a_consolider int)
language sql stable security definer set search_path = public as $$
  with lundi as (select date_trunc('week', now() at time zone 'Europe/Paris')::date as l,
                        (now() at time zone 'Europe/Paris')::date as a),
  jours as (
    select r.eleve_id, (r.cree_le at time zone 'Europe/Paris')::date as d, count(*) as n
      from carte_reponses r join eleves e on e.id = r.eleve_id
     where e.classe_id = p_classe and r.cree_le > now() - interval '36 days'
     group by 1, 2)
  select e.id, e.identifiant, e.prenom, e.actif,
    (select max(cree_le) from carte_reponses r where r.eleve_id = e.id),
    (select count(*) from jours j, lundi where j.eleve_id = e.id and j.d > a - 7)::int,
    (select count(*) from jours j, lundi where j.eleve_id = e.id and j.n >= 5 and j.d >= l)::int,
    (select count(*) from jours j, lundi where j.eleve_id = e.id and j.n >= 5 and j.d >= l - 7  and j.d < l)::int,
    (select count(*) from jours j, lundi where j.eleve_id = e.id and j.n >= 5 and j.d >= l - 14 and j.d < l - 7)::int,
    (select count(*) from jours j, lundi where j.eleve_id = e.id and j.n >= 5 and j.d >= l - 21 and j.d < l - 14)::int,
    (select count(*) from carte_suivi s where s.eleve_id = e.id)::int,
    (select count(*) from carte_suivi s where s.eleve_id = e.id and s.boite >= 4 and not s.a_consolider)::int,
    (select count(*) from carte_suivi s where s.eleve_id = e.id and (s.a_consolider or s.boite <= 1))::int
  from eleves e
  where e.classe_id = p_classe and est_prof_de(p_classe)
  order by e.identifiant;
$$;

-- 9. Résultats de la classe carte par carte (pour repérer les cartes ratées)
create or replace function prof_cartes(p_classe uuid)
returns table (carte_id text, eleves int, reponses int, non int, moitie int, oui int, consolider int)
language sql stable security definer set search_path = public as $$
  select r.carte_id,
         count(distinct r.eleve_id)::int,
         count(*)::int,
         count(*) filter (where r.reponse = 0)::int,
         count(*) filter (where r.reponse = 1)::int,
         count(*) filter (where r.reponse = 2)::int,
         (select count(*) from carte_suivi s join eleves e2 on e2.id = s.eleve_id
           where e2.classe_id = p_classe and s.carte_id = r.carte_id and (s.a_consolider or s.boite <= 1))::int
    from carte_reponses r join eleves e on e.id = r.eleve_id
   where e.classe_id = p_classe and est_prof_de(p_classe)
   group by r.carte_id;
$$;

-- 10. Nouveau code PIN pour un élève qui l'a oublié (6 chiffres, affiché une seule fois)
create extension if not exists pgcrypto with schema extensions;
create or replace function prof_nouveau_pin(p_eleve uuid) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare u uuid; c uuid; pin text;
begin
  select user_id, classe_id into u, c from eleves where id = p_eleve;
  if u is null or not est_prof_de(c) then raise exception 'Non autorisé'; end if;
  pin := (100000 + floor(random() * 900000))::int::text;
  update auth.users set encrypted_password = extensions.crypt(pin, extensions.gen_salt('bf')) where id = u;
  return pin;
end $$;

grant execute on function est_prof_de(uuid) to authenticated;
grant execute on function prof_eleves(uuid) to authenticated;
grant execute on function prof_cartes(uuid) to authenticated;
grant execute on function prof_nouveau_pin(uuid) to authenticated;
