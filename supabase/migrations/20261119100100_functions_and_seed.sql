-- Fonctions atomiques (appelées uniquement par le serveur avec la clé service),
-- vérification publique des reçus, résultats et données initiales.

-- Les totaux exposés au public n'incluent pas les recettes
revoke select on public.candidate_stats from anon, authenticated;
grant select (candidate_id, event_id, category_id, paid_votes, free_votes, total_votes, updated_at)
  on public.candidate_stats to anon, authenticated;

create or replace function public.event_voting_open(e public.events)
returns boolean language sql stable as $$
  select e.status = 'published'
     and (e.vote_opens_at is null or e.vote_opens_at <= now())
     and (e.vote_closes_at is null or e.vote_closes_at > now());
$$;

-- ---------- Vote payant : confirmé UNIQUEMENT après vérification Kkiapay côté serveur ----------
create or replace function public.confirm_paid_vote(
  p_payment_id uuid, p_transaction_id text, p_method text, p_payload jsonb,
  p_paid_amount int, p_receipt_code text, p_fingerprint text
) returns table (receipt_code text, total_votes int, already_confirmed boolean)
language plpgsql security definer set search_path = public as $$
declare p public.payments; qty int; existing text;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if p.status = 'success' then
    select v.receipt_code into existing from public.votes v where v.payment_id = p.id;
    return query select existing, p.votes + p.bonus_votes, true;
    return;
  end if;
  if p_paid_amount < p.amount_xof then
    update public.payments set status = 'failed', failure_reason = 'amount_mismatch', provider_payload = p_payload where id = p.id;
    raise exception 'amount_mismatch';
  end if;
  if exists (select 1 from public.payments where provider_transaction_id = p_transaction_id and id <> p.id) then
    raise exception 'transaction_reused';
  end if;

  qty := p.votes + p.bonus_votes;
  update public.payments
     set status = 'success', provider_transaction_id = p_transaction_id, method = p_method,
         provider_payload = p_payload, confirmed_at = now()
   where id = p.id;

  insert into public.receipts (code, kind, event_id, votes, fingerprint)
  values (p_receipt_code, 'vote', p.event_id, qty, p_fingerprint);

  insert into public.votes (event_id, category_id, candidate_id, kind, quantity, payment_id, phone_hash, receipt_code)
  values (p.event_id, p.category_id, p.candidate_id, 'paid', qty, p.id, p.phone_hash, p_receipt_code);

  update public.candidate_stats
     set paid_votes = paid_votes + qty, revenue_xof = revenue_xof + p.amount_xof, updated_at = now()
   where candidate_id = p.candidate_id;

  return query select p_receipt_code, qty, false;
end;
$$;

-- ---------- Vote gratuit contrôlé ----------
create or replace function public.record_free_vote(
  p_candidate_id uuid, p_phone_hash text, p_ip_hash text, p_device_hash text,
  p_receipt_code text, p_fingerprint text
) returns table (receipt_code text, remaining int)
language plpgsql security definer set search_path = public as $$
declare c public.candidates; e public.events; used int;
begin
  select * into c from public.candidates where id = p_candidate_id;
  if not found or not c.is_published then raise exception 'candidate_unavailable'; end if;
  select * into e from public.events where id = c.event_id for update;
  if not public.event_voting_open(e) then raise exception 'voting_closed'; end if;
  if not ('free' = any(e.modes)) then raise exception 'free_vote_disabled'; end if;

  select count(*) into used from public.votes
   where phone_hash = p_phone_hash and category_id = c.category_id and kind = 'free'
     and created_at > now() - interval '24 hours';
  if used >= e.free_votes_per_day then raise exception 'free_quota_reached'; end if;

  insert into public.receipts (code, kind, event_id, votes, fingerprint) values (p_receipt_code, 'vote', e.id, 1, p_fingerprint);
  insert into public.votes (event_id, category_id, candidate_id, kind, quantity, phone_hash, ip_hash, device_hash, receipt_code)
  values (e.id, c.category_id, c.id, 'free', 1, p_phone_hash, p_ip_hash, p_device_hash, p_receipt_code);
  update public.candidate_stats set free_votes = free_votes + 1, updated_at = now() where candidate_id = c.id;

  return query select p_receipt_code, e.free_votes_per_day - used - 1;
end;
$$;

-- ---------- Bulletin secret ----------
create or replace function public.cast_ballot(
  p_elector_id uuid, p_choices jsonb, p_receipt_code text, p_fingerprint text
) returns text
language plpgsql security definer set search_path = public as $$
declare el public.electors; e public.events; cat record; picks jsonb; n int; bad int;
begin
  select * into el from public.electors where id = p_elector_id for update;
  if not found then raise exception 'elector_not_found'; end if;
  if el.has_voted then raise exception 'already_voted'; end if;
  select * into e from public.events where id = el.event_id;
  if not public.event_voting_open(e) or not ('election' = any(e.modes)) then raise exception 'voting_closed'; end if;

  -- Chaque clé doit être une catégorie de l'événement
  if exists (select 1 from jsonb_object_keys(p_choices) k
             where not exists (select 1 from public.categories where id::text = k and event_id = e.id)) then
    raise exception 'invalid_category';
  end if;

  for cat in select id, max_choices from public.categories where event_id = e.id loop
    picks := coalesce(p_choices -> cat.id::text, '[]'::jsonb);
    if jsonb_typeof(picks) <> 'array' then raise exception 'invalid_choices'; end if;
    n := jsonb_array_length(picks);
    if n > cat.max_choices then raise exception 'too_many_choices'; end if;
    select count(*) into bad from jsonb_array_elements_text(picks) x
     where not exists (select 1 from public.candidates c where c.id::text = x and c.category_id = cat.id and c.is_published);
    if bad > 0 then raise exception 'invalid_candidate'; end if;
    if (select count(distinct x) from jsonb_array_elements_text(picks) x) <> n then raise exception 'duplicate_choice'; end if;
  end loop;

  insert into public.receipts (code, kind, event_id, fingerprint) values (p_receipt_code, 'ballot', e.id, p_fingerprint);
  insert into public.ballots (event_id, choices, receipt_code) values (e.id, p_choices, p_receipt_code);
  update public.electors set has_voted = true, voted_at = now() where id = el.id;
  return p_receipt_code;
end;
$$;

-- ---------- Vérification publique d'un reçu ----------
create or replace function public.verify_receipt(p_code text)
returns table (kind text, event_title text, event_slug text, votes int, recorded_on date,
               fingerprint text, electors_total bigint, electors_voted bigint)
language sql stable security definer set search_path = public as $$
  select r.kind, e.title, e.slug, r.votes, r.created_at::date, r.fingerprint,
         case when r.kind = 'ballot' then (select count(*) from public.electors x where x.event_id = e.id) end,
         case when r.kind = 'ballot' then (select count(*) from public.electors x where x.event_id = e.id and x.has_voted) end
    from public.receipts r join public.events e on e.id = r.event_id
   where r.code = upper(trim(p_code));
$$;

-- ---------- Résultats d'élection (après clôture, ou organisateur) ----------
create or replace function public.election_results(p_event_id uuid)
returns table (category_id uuid, candidate_id uuid, votes bigint, blank bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.owns_event(p_event_id)
          or exists (select 1 from public.events where id = p_event_id and status = 'closed')) then
    raise exception 'results_sealed';
  end if;
  return query
  with cats as (select id from public.categories where event_id = p_event_id),
  picks as (
    select c.id as cat, x as cand
      from public.ballots b cross join cats c
      cross join lateral jsonb_array_elements_text(coalesce(b.choices -> c.id::text, '[]'::jsonb)) x
     where b.event_id = p_event_id
  ),
  blanks as (
    select c.id as cat, count(*) as n from public.ballots b cross join cats c
     where b.event_id = p_event_id and jsonb_array_length(coalesce(b.choices -> c.id::text, '[]'::jsonb)) = 0
     group by c.id
  )
  select cd.category_id, cd.id, count(p.cand), coalesce(bl.n, 0)
    from public.candidates cd
    left join picks p on p.cand = cd.id::text and p.cat = cd.category_id
    left join blanks bl on bl.cat = cd.category_id
   where cd.event_id = p_event_id and cd.is_published
   group by cd.category_id, cd.id, bl.n;
end;
$$;

-- ---------- Classement combiné jury + public (organisateur) ----------
create or replace function public.event_ranking(p_event_id uuid)
returns table (category_id uuid, candidate_id uuid, public_votes bigint, public_score numeric,
               jury_score numeric, final_score numeric, revenue_xof bigint)
language plpgsql stable security definer set search_path = public as $$
declare w numeric;
begin
  if not public.owns_event(p_event_id) then raise exception 'forbidden'; end if;
  select jury_weight / 100.0 into w from public.events where id = p_event_id;
  return query
  with s as (
    select cs.*, max(cs.total_votes) over (partition by cs.category_id) as max_votes
      from public.candidate_stats cs where cs.event_id = p_event_id
  ),
  jury as (
    select per_juror.candidate_id, avg(per_juror.score) as score
      from (select j.candidate_id, j.juror_id,
                   sum(j.score / cr.max_score * cr.weight) / nullif(sum(cr.weight), 0) * 100 as score
              from public.jury_scores j join public.criteria cr on cr.id = j.criterion_id
             where j.event_id = p_event_id
             group by j.candidate_id, j.juror_id) per_juror
     group by per_juror.candidate_id
  )
  select s.category_id, s.candidate_id, s.total_votes,
         round(case when s.max_votes > 0 then s.total_votes::numeric / s.max_votes * 100 else 0 end, 2),
         round(coalesce(jury.score, 0), 2),
         round(w * coalesce(jury.score, 0)
               + (1 - w) * case when s.max_votes > 0 then s.total_votes::numeric / s.max_votes * 100 else 0 end, 2),
         s.revenue_xof
    from s left join jury on jury.candidate_id = s.candidate_id;
end;
$$;

-- ---------- Droits d'exécution ----------
revoke execute on function public.confirm_paid_vote(uuid, text, text, jsonb, int, text, text) from public, anon, authenticated;
revoke execute on function public.record_free_vote(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.cast_ballot(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.confirm_paid_vote(uuid, text, text, jsonb, int, text, text) to service_role;
grant execute on function public.record_free_vote(uuid, text, text, text, text, text) to service_role;
grant execute on function public.cast_ballot(uuid, jsonb, text, text) to service_role;
revoke execute on function public.election_results(uuid) from public, anon;
grant execute on function public.election_results(uuid) to authenticated, service_role;
revoke execute on function public.event_ranking(uuid) from public, anon;
grant execute on function public.event_ranking(uuid) to authenticated, service_role;
grant execute on function public.verify_receipt(text) to anon, authenticated;

-- ---------- Temps réel pour l'écran géant et les classements ----------
alter publication supabase_realtime add table public.candidate_stats;

-- ---------- Données initiales ----------
insert into public.site_settings (id, theme, home_sections, modules, payment_methods, content) values (1,
  '{"primary":"#1F6FE5","accent":"#F2A516","ink":"#0B1B33","headingFont":"Sora","radius":16,"animation":"soft"}',
  '[{"key":"hero","label":"Bandeau principal","visible":true},{"key":"feed","label":"Fil des votes en direct","visible":true},{"key":"events","label":"Événements en cours","visible":true},{"key":"modes","label":"Cinq façons de voter","visible":true},{"key":"steps","label":"Voter en 3 étapes","visible":true},{"key":"pricing","label":"Tarifs","visible":true}]',
  '{"paid":true,"free":true,"jury":true,"election":true,"live":true,"consent_required":true,"whatsapp":true,"ussd":false,"ticketing":false}',
  '{"wave":true,"orange_money":true,"mtn":true,"moov":true,"card":true}',
  '{"heroTitle":"Votez en 10 secondes.","heroHighlight":"Des résultats que tout le monde peut vérifier.","heroText":"La plateforme de vote des concours, awards et élections en Afrique de l''Ouest. Paiement par Wave, Orange Money, MTN, Moov ou carte, sans créer de compte."}'
);
insert into public.platform_config (id) values (1);
insert into public.plans (slug, name, price_xof, commission_pct, max_events_month, max_candidates, features, display_order) values
  ('free', 'Gratuit', 0, 15, 1, 5, '["1 événement actif","5 candidats maximum","Vote public payant ou gratuit"]', 1),
  ('pro', 'Pro', 25000, 10, 20, 100, '["20 événements / mois","Jury avec grille de notation","Écran géant en direct","Statistiques et exports"]', 2),
  ('premium', 'Premium', 100000, 7, -1, -1, '["Événements illimités","Liste électorale et bulletin secret","Marque blanche"]', 3);
