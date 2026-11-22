-- =====================================================================
-- PC Lab — installation complète de la base (nouveau projet Supabase)
-- À coller UNE SEULE FOIS dans Supabase > SQL Editor, puis « Run ».
-- Crée toutes les tables, la sécurité et les fonctions du site.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- Tables
create table if not exists profs (
  id      uuid primary key references auth.users(id) on delete cascade,
  nom     text,
  cree_le timestamptz not null default now()
);

create table if not exists classes (
  id               uuid primary key default gen_random_uuid(),
  prof_id          uuid not null references profs(id) on delete cascade,
  nom              text not null,
  annee            text,
  message          text,                 -- message affiché sur l'accueil des élèves
  message_le       timestamptz,
  objectif_seances smallint not null default 3 check (objectif_seances between 1 and 7),
  cree_le          timestamptz not null default now()
);

create table if not exists eleves (
  id          uuid primary key default gen_random_uuid(),
  classe_id   uuid not null references classes(id) on delete cascade,
  identifiant text not null unique,       -- ex. PC26-A-07
  prenom      text,                       -- facultatif, visible du professeur
  user_id     uuid unique references auth.users(id) on delete set null,
  theme       text not null default 'ocean',
  actif       boolean not null default true,
  cree_le     timestamptz not null default now()
);

create table if not exists classe_chapitres (
  classe_id    uuid not null references classes(id) on delete cascade,
  chapter_id   int  not null,
  active       boolean not null default false,
  activated_at timestamptz,
  primary key (classe_id, chapter_id)
);

create table if not exists carte_suivi (
  eleve_id         uuid     not null references eleves(id) on delete cascade,
  carte_id         text     not null,              -- ex. 'ch5-p1-lois-de-newton-06'
  boite            smallint not null default 1 check (boite between 1 and 5),
  a_consolider     boolean  not null default false,
  prochaine        date     not null default current_date,
  nb_reponses      integer  not null default 0,
  derniere_reponse timestamptz,
  primary key (eleve_id, carte_id)
);

create table if not exists carte_reponses (
  id       bigserial primary key,
  eleve_id uuid not null references eleves(id) on delete cascade,
  carte_id text not null,
  reponse  smallint not null check (reponse in (0, 1, 2)),   -- 0 Non, 1 À moitié, 2 Oui
  cree_le  timestamptz not null default now()
);
create index if not exists carte_reponses_eleve_date on carte_reponses (eleve_id, cree_le);
create index if not exists eleves_classe on eleves (classe_id);

-- ---------------------------------------------------------------- Fonctions d'aide
create or replace function current_eleve_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from eleves where user_id = auth.uid() and actif $$;

create or replace function est_prof() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profs where id = auth.uid()) $$;

create or replace function est_prof_de(p_classe uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from classes where id = p_classe and prof_id = auth.uid()) $$;

create or replace function classe_de_eleve(p_eleve uuid) returns uuid
language sql stable security definer set search_path = public as
$$ select classe_id from eleves where id = p_eleve $$;

-- ---------------------------------------------------------------- Sécurité (RLS)
alter table profs            enable row level security;
alter table classes          enable row level security;
alter table eleves           enable row level security;
alter table classe_chapitres enable row level security;
alter table carte_suivi      enable row level security;
alter table carte_reponses   enable row level security;

drop policy if exists profs_soi on profs;
create policy profs_soi on profs for select to authenticated using (id = auth.uid());

drop policy if exists classes_prof on classes;
create policy classes_prof on classes for all to authenticated
  using (prof_id = auth.uid()) with check (prof_id = auth.uid() and est_prof());
drop policy if exists classes_eleve on classes;
create policy classes_eleve on classes for select to authenticated
  using (id = (select classe_id from eleves where user_id = auth.uid()));

drop policy if exists eleves_prof on eleves;
create policy eleves_prof on eleves for all to authenticated
  using (est_prof_de(classe_id)) with check (est_prof_de(classe_id));
drop policy if exists eleves_soi on eleves;
create policy eleves_soi on eleves for select to authenticated using (user_id = auth.uid());

drop policy if exists chapitres_prof on classe_chapitres;
create policy chapitres_prof on classe_chapitres for all to authenticated
  using (est_prof_de(classe_id)) with check (est_prof_de(classe_id));
drop policy if exists chapitres_eleve on classe_chapitres;
create policy chapitres_eleve on classe_chapitres for select to authenticated
  using (classe_id = (select classe_id from eleves where user_id = auth.uid()));

drop policy if exists suivi_lecture on carte_suivi;
create policy suivi_lecture on carte_suivi for select to authenticated
  using (eleve_id = current_eleve_id() or est_prof_de(classe_de_eleve(eleve_id)));
drop policy if exists reponses_lecture on carte_reponses;
create policy reponses_lecture on carte_reponses for select to authenticated
  using (eleve_id = current_eleve_id() or est_prof_de(classe_de_eleve(eleve_id)));
-- Aucune écriture directe sur le suivi : tout passe par repondre_carte().

-- ---------------------------------------------------------------- Professeur
-- Le premier compte qui appelle cette fonction devient professeur
-- (une seule fois : ensuite, plus personne ne peut s'ajouter).
create or replace function initialiser_prof(p_nom text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from profs where id = auth.uid()) then return true; end if;
  if exists (select 1 from profs) then return false; end if;
  insert into profs (id, nom) values (auth.uid(), p_nom);
  return true;
end $$;

-- ---------------------------------------------------------------- Élève
create or replace function maj_preferences(p_theme text) returns void
language sql security definer set search_path = public as
$$ update eleves set theme = p_theme where user_id = auth.uid() and p_theme in ('ocean', 'emeraude', 'violet') $$;

-- Boîtes de Leitner :
--   Oui      : monte d'une boîte (5 max), revient après 1/3/7/15/30 jours
--              (seulement si la carte était à revoir ce jour-là, ou nouvelle)
--   À moitié : reste dans sa boîte, revient le lendemain
--   Non      : recule d'une boîte (1 min), revient le lendemain, « à consolider » jusqu'au prochain Oui
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

-- Séances de la semaine (lundi → dimanche) : jours avec au moins 5 réponses
create or replace function seances_semaine() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from (
    select (cree_le at time zone 'Europe/Paris')::date
      from carte_reponses
     where eleve_id = current_eleve_id()
       and (cree_le at time zone 'Europe/Paris')::date >= date_trunc('week', now() at time zone 'Europe/Paris')::date
     group by 1 having count(*) >= 5) j;
$$;

-- ---------------------------------------------------------------- Tableau de bord professeur
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

create or replace function prof_cartes(p_classe uuid)
returns table (carte_id text, eleves int, reponses int, non int, moitie int, oui int, consolider int)
language sql stable security definer set search_path = public as $$
  select r.carte_id, count(distinct r.eleve_id)::int, count(*)::int,
         count(*) filter (where r.reponse = 0)::int,
         count(*) filter (where r.reponse = 1)::int,
         count(*) filter (where r.reponse = 2)::int,
         (select count(*) from carte_suivi s join eleves e2 on e2.id = s.eleve_id
           where e2.classe_id = p_classe and s.carte_id = r.carte_id and (s.a_consolider or s.boite <= 1))::int
    from carte_reponses r join eleves e on e.id = r.eleve_id
   where e.classe_id = p_classe and est_prof_de(p_classe)
   group by r.carte_id;
$$;

-- Nouveau code à 6 chiffres pour un élève (affiché une seule fois au professeur)
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

-- Remise à zéro de la progression d'un élève (par exemple en début d'année)
create or replace function prof_effacer_progression(p_eleve uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_prof_de(classe_de_eleve(p_eleve)) then raise exception 'Non autorisé'; end if;
  delete from carte_reponses where eleve_id = p_eleve;
  delete from carte_suivi    where eleve_id = p_eleve;
end $$;

-- ---------------------------------------------------------------- Droits
revoke all on function prof_nouveau_pin(uuid) from public, anon;
revoke all on function prof_effacer_progression(uuid) from public, anon;
grant execute on function current_eleve_id(), est_prof(), est_prof_de(uuid), classe_de_eleve(uuid),
  initialiser_prof(text), maj_preferences(text), repondre_carte(text, int), seances_semaine(),
  prof_eleves(uuid), prof_cartes(uuid), prof_nouveau_pin(uuid), prof_effacer_progression(uuid)
  to authenticated;

-- ---------------------------------------------------------------- Accès des comptes connectés
-- (le projet n'expose aucune table par défaut : on autorise seulement ce qui est utile,
--  la sécurité ligne par ligne ci-dessus décide ensuite de ce que chacun voit)
grant usage on schema public to authenticated;
grant select on profs to authenticated;
grant select, insert, update, delete on classes, eleves, classe_chapitres to authenticated;
grant select on carte_suivi, carte_reponses to authenticated;
revoke all on profs, classes, eleves, classe_chapitres, carte_suivi, carte_reponses from anon;
