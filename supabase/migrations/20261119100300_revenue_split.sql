-- Les recettes ne doivent jamais transiter par le canal temps réel public :
-- elles quittent candidate_stats pour une table réservée à l'organisateur.
create table public.candidate_revenue (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  revenue_xof bigint not null default 0
);
alter table public.candidate_revenue enable row level security;
create policy revenue_owner_read on public.candidate_revenue for select to authenticated using (public.owns_event(event_id));

insert into public.candidate_revenue (candidate_id, event_id, revenue_xof)
select candidate_id, event_id, revenue_xof from public.candidate_stats;

alter table public.candidate_stats drop column revenue_xof;
grant select on public.candidate_stats to anon, authenticated;

create or replace function public.ensure_candidate_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.candidate_stats (candidate_id, event_id, category_id)
  values (new.id, new.event_id, new.category_id)
  on conflict (candidate_id) do update set category_id = excluded.category_id;
  insert into public.candidate_revenue (candidate_id, event_id) values (new.id, new.event_id)
  on conflict (candidate_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.ensure_candidate_stats() from public, anon, authenticated;

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
  update public.candidate_stats set paid_votes = paid_votes + qty, updated_at = now() where candidate_id = p.candidate_id;
  insert into public.candidate_revenue (candidate_id, event_id, revenue_xof) values (p.candidate_id, p.event_id, p.amount_xof)
  on conflict (candidate_id) do update set revenue_xof = public.candidate_revenue.revenue_xof + excluded.revenue_xof;
  return query select p_receipt_code, qty, false;
end;
$$;
revoke execute on function public.confirm_paid_vote(uuid, text, text, jsonb, int, text, text) from public, anon, authenticated;
grant execute on function public.confirm_paid_vote(uuid, text, text, jsonb, int, text, text) to service_role;

drop function public.event_ranking(uuid);
create function public.event_ranking(p_event_id uuid)
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
         coalesce(r.revenue_xof, 0)
    from s left join jury on jury.candidate_id = s.candidate_id
           left join public.candidate_revenue r on r.candidate_id = s.candidate_id;
end;
$$;
revoke execute on function public.event_ranking(uuid) from public, anon;
grant execute on function public.event_ranking(uuid) to authenticated, service_role;
