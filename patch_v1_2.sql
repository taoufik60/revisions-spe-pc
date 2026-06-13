-- ============================================================
-- PATCH v1.2 — Branchement de l'authentification et du site
-- À exécuter dans SQL Editor APRÈS schema.sql et items_seed.sql
-- ============================================================

-- 1. Les élèves s'authentifient via Supabase Auth (email synthétique
--    identifiant@eleves.tspc.local + code PIN comme mot de passe).
alter table eleves add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table eleves alter column pin_hash drop not null;

create or replace function current_eleve_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from eleves where user_id = auth.uid() and actif $$;

-- 2. L'élève doit pouvoir lire les réglages de SA classe (dosage des séances)
create policy classes_eleve_read on classes for select
  using (exists(select 1 from eleves e where e.classe_id = id and e.user_id = auth.uid()));

-- 3. La vue élève n'est accessible qu'aux utilisateurs connectés
revoke select on v_items_eleve from anon;

-- 4. Types de séance : 'jour' (prescrite) ou 'libre' (révisions spéciales)
alter table seances drop constraint if exists seances_type_check;
alter table seances add constraint seances_type_check check (type in ('jour','libre'));

-- 5. repondre() avec mode : en séance libre, une réussite n'accélère pas
--    le planning (seuls les échecs font redescendre la notion).
create or replace function repondre(
  p_item_id text, p_response_key text, p_duration_ms int default null,
  p_mode text default 'jour'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_eleve uuid := current_eleve_id();
  v_item items%rowtype;
  v_correct boolean;
  v_nid text;
begin
  if v_eleve is null then raise exception 'non authentifié'; end if;
  select * into v_item from items where id = p_item_id and status = 'active';
  if not found then raise exception 'item inconnu ou archivé'; end if;

  v_correct := (p_response_key = v_item.answer);

  insert into reponses (eleve_id, item_id, correct, response_key, duration_ms)
  values (v_eleve, p_item_id, v_correct, p_response_key, p_duration_ms);

  foreach v_nid in array v_item.notion_ids loop
    if p_mode = 'libre' and v_correct then
      -- réussite en mode libre : on note la visite, sans avancer
      update srs_notions set last_review = now()
        where eleve_id = v_eleve and notion_id = v_nid;
      if not found then
        insert into srs_notions (eleve_id, notion_id, box, due_date, streak, last_review)
        values (v_eleve, v_nid, 2, current_date + 3, 1, now())
        on conflict do nothing;
      end if;
    else
      insert into srs_notions (eleve_id, notion_id, box, due_date, streak, last_review)
      values (v_eleve, v_nid,
              case when v_correct then 2 else 1 end,
              current_date + case when v_correct then 3 else 1 end,
              case when v_correct then 1 else 0 end, now())
      on conflict (eleve_id, notion_id) do update set
        box = case when v_correct then least(srs_notions.box + 1, 5) else 1 end,
        due_date = current_date + (case when v_correct
                   then (array[1,3,7,15,30])[least(srs_notions.box + 1, 5)]
                   else 1 end),
        streak = case when v_correct then srs_notions.streak + 1 else 0 end,
        last_review = now();
    end if;
  end loop;

  return jsonb_build_object('correct', v_correct,
    'bonne_reponse', v_item.answer, 'feedback', v_item.feedback);
end $$;
grant execute on function repondre to authenticated;

-- 6. Auto-évaluation d'une flashcard (su = avance, non su = redescend)
create or replace function evaluer_carte(p_item_id text, p_su boolean, p_mode text default 'jour')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_eleve uuid := current_eleve_id();
  v_item items%rowtype; v_nid text;
begin
  if v_eleve is null then raise exception 'non authentifié'; end if;
  select * into v_item from items where id = p_item_id and status = 'active';
  if not found then return; end if;
  insert into reponses (eleve_id, item_id, correct, response_key)
  values (v_eleve, p_item_id, p_su, case when p_su then 'SU' else 'NON_SU' end);
  foreach v_nid in array v_item.notion_ids loop
    if p_mode = 'libre' and p_su then
      update srs_notions set last_review = now() where eleve_id = v_eleve and notion_id = v_nid;
    else
      insert into srs_notions (eleve_id, notion_id, box, due_date, streak, last_review)
      values (v_eleve, v_nid, case when p_su then 2 else 1 end,
              current_date + case when p_su then 3 else 1 end,
              case when p_su then 1 else 0 end, now())
      on conflict (eleve_id, notion_id) do update set
        box = case when p_su then least(srs_notions.box + 1, 5) else 1 end,
        due_date = current_date + (case when p_su
                   then (array[1,3,7,15,30])[least(srs_notions.box + 1, 5)] else 1 end),
        streak = case when p_su then srs_notions.streak + 1 else 0 end,
        last_review = now();
    end if;
  end loop;
end $$;
grant execute on function evaluer_carte to authenticated;

-- 7. Enregistrement d'une séance terminée (assiduité)
create or replace function enregistrer_seance(p_type text, p_n_items int, p_n_correct int)
returns void language plpgsql security definer set search_path = public as $$
declare v_eleve uuid := current_eleve_id();
begin
  if v_eleve is null then raise exception 'non authentifié'; end if;
  insert into seances (eleve_id, type, n_items, n_correct, finished_at)
  values (v_eleve, p_type, p_n_items, p_n_correct, now());
end $$;
grant execute on function enregistrer_seance to authenticated;

-- ============================================================
-- 8. PROMOTION DE VOTRE COMPTE EN ADMINISTRATEUR
--    À exécuter UNE FOIS, APRÈS avoir créé votre compte prof
--    depuis la page admin du site. Remplacez l'adresse email
--    par celle utilisée pour votre compte.
-- ============================================================
-- insert into profs (id, nom, role)
-- select id, 'Taoufik', 'admin' from auth.users
-- where email = 'VOTRE_EMAIL_ICI'
-- on conflict (id) do update set role = 'admin';
