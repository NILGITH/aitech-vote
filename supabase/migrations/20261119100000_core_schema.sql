-- Aitech Vote — schéma principal
-- Principe : le navigateur ne peut jamais écrire de vote, de paiement ou de bulletin.
-- Ces écritures passent par des routes serveur (clé service) qui appellent des
-- fonctions SQL atomiques. Le public ne lit que des données publiées.

create extension if not exists pgcrypto;

-- ============ Profils et rôles ============
create type public.user_role as enum ('super_admin', 'organizer', 'jury');
create type public.account_status as enum ('pending', 'active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  organization_name text,
  role public.user_role not null default 'organizer',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fonctions d'aide : SECURITY DEFINER pour éviter toute récursion RLS
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and status = 'active');
$$;

create or replace function public.is_active_organizer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('organizer','super_admin') and status = 'active');
$$;

-- Création automatique du profil à l'inscription (toujours organisateur en attente)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, organization_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.raw_user_meta_data->>'organization_name');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
-- Un utilisateur ne peut modifier que ses champs descriptifs, jamais son rôle ni son statut
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, organization_name) on public.profiles to authenticated;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ============ Paramètres de la plateforme ============
-- Paramètres publics (apparence, modules, contenus) : lisibles par tous
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  theme jsonb not null default '{}'::jsonb,
  home_sections jsonb not null default '[]'::jsonb,
  modules jsonb not null default '{}'::jsonb,
  payment_methods jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.site_settings enable row level security;
create policy site_settings_public_read on public.site_settings for select using (true);

-- Paramètres financiers : super admin uniquement
create table public.platform_config (
  id int primary key default 1 check (id = 1),
  kkiapay_fee_pct numeric(5,2),
  fee_bearer text not null default 'organizer' check (fee_bearer in ('organizer','platform','voter')),
  min_payout_xof int not null default 10000,
  payout_delay text not null default '48h',
  election_fee_per_voter_xof int,
  terms_version text not null default '2026-11',
  updated_at timestamptz not null default now()
);
alter table public.platform_config enable row level security;
create policy platform_config_admin on public.platform_config for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_xof int not null default 0 check (price_xof >= 0),
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  max_events_month int not null default 1,       -- -1 = illimité
  max_candidates int not null default 5,         -- -1 = illimité
  features jsonb not null default '[]'::jsonb,
  is_visible boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create policy plans_public_read on public.plans for select using (is_visible or public.is_super_admin());
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.subscriptions(organizer_id);
alter table public.subscriptions enable row level security;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (organizer_id = auth.uid() or public.is_super_admin());
create policy subscriptions_admin_write on public.subscriptions for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create table public.commission_overrides (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  commission_pct numeric(5,2) not null check (commission_pct between 0 and 100),
  valid_until date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.commission_overrides enable row level security;
create policy overrides_admin on public.commission_overrides for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============ Clés API (Resend, Kkiapay, Kapso) ============
-- Les secrets sont chiffrés côté serveur (AES-256-GCM) avant stockage.
-- Aucune politique RLS : seule la clé service peut lire ou écrire.
create table public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('resend','kkiapay','kapso')),
  event_id uuid,                              -- null = clé par défaut de la plateforme
  label text,
  public_config jsonb not null default '{}'::jsonb,  -- valeurs non secrètes (clé publique, expéditeur…)
  secret_ciphertext text,                     -- JSON chiffré des secrets
  secret_hints jsonb not null default '{}'::jsonb,   -- 4 derniers caractères pour l'affichage
  is_active boolean not null default true,
  last_test_at timestamptz,
  last_test_ok boolean,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create unique index api_credentials_default_uq on public.api_credentials(provider) where event_id is null;
create unique index api_credentials_event_uq on public.api_credentials(provider, event_id) where event_id is not null;
alter table public.api_credentials enable row level security;

-- ============ Événements ============
create type public.event_status as enum ('draft','pending_review','published','closed','archived');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  short_code text unique check (short_code ~ '^[A-Z0-9]{3,12}$'),
  title text not null,
  description text,
  event_type text not null default 'awards' check (event_type in ('awards','beauty','talent','election','other')),
  cover_url text,
  location text,
  starts_at timestamptz,
  vote_opens_at timestamptz,
  vote_closes_at timestamptz,
  status public.event_status not null default 'draft',
  modes text[] not null default array['paid']::text[]
    check (modes <@ array['paid','free','jury','election','live']::text[]),
  jury_weight int not null default 0 check (jury_weight between 0 and 100),
  price_per_vote_xof int not null default 100 check (price_per_vote_xof >= 0),
  packs jsonb not null default '[{"votes":1,"bonus":0},{"votes":5,"bonus":0},{"votes":10,"bonus":1},{"votes":50,"bonus":8}]'::jsonb,
  require_otp boolean not null default true,
  free_votes_per_day int not null default 1,
  max_paid_votes_per_hour int not null default 200,
  show_live_results boolean not null default true,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.events(organizer_id);
create index on public.events(status);

create or replace function public.owns_event(e uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = e and organizer_id = auth.uid()) or public.is_super_admin();
$$;

create or replace function public.event_is_public(e uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = e and status in ('published','closed'));
$$;

alter table public.events enable row level security;
create policy events_public_read on public.events for select
  using (status in ('published','closed') or organizer_id = auth.uid() or public.is_super_admin());
create policy events_insert on public.events for insert to authenticated
  with check (organizer_id = auth.uid() and public.is_active_organizer() and status in ('draft','pending_review'));
create policy events_update on public.events for update to authenticated
  using (organizer_id = auth.uid() or public.is_super_admin())
  with check (organizer_id = auth.uid() or public.is_super_admin());
create policy events_delete on public.events for delete to authenticated
  using ((organizer_id = auth.uid() and status = 'draft') or public.is_super_admin());

-- Un organisateur ne peut pas publier lui-même un événement en attente de validation :
-- la publication est contrôlée par ce déclencheur.
create or replace function public.guard_event_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.is_super_admin() and auth.role() <> 'service_role' then
    if new.status = 'published' and old.status <> 'closed' then
      if not exists (select 1 from public.profiles where id = new.organizer_id and status = 'active') then
        raise exception 'Compte organisateur non validé';
      end if;
    end if;
  end if;
  if new.organizer_id is distinct from old.organizer_id and not public.is_super_admin() and auth.role() <> 'service_role' then
    raise exception 'Changement de propriétaire interdit';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger events_guard before update on public.events for each row execute function public.guard_event_status();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  max_choices int not null default 1 check (max_choices >= 1),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.categories(event_id);
alter table public.categories enable row level security;
create policy categories_read on public.categories for select
  using (public.event_is_public(event_id) or public.owns_event(event_id));
create policy categories_write on public.categories for all to authenticated
  using (public.owns_event(event_id)) with check (public.owns_event(event_id));

-- ============ Candidats et consentement ============
create type public.consent_status as enum ('not_sent','pending','accepted','refused','bounced','withdrawn');

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,16}$'),
  display_name text not null,
  bio text,
  photo_url text,
  video_url text,
  social jsonb not null default '{}'::jsonb,
  position int not null default 0,
  consent_status public.consent_status not null default 'not_sent',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code)
);
create index on public.candidates(event_id);
create index on public.candidates(category_id);
alter table public.candidates enable row level security;
create policy candidates_public_read on public.candidates for select
  using ((is_published and public.event_is_public(event_id)) or public.owns_event(event_id));
create policy candidates_insert on public.candidates for insert to authenticated
  with check (public.owns_event(event_id) and is_published = false and consent_status = 'not_sent');
create policy candidates_update on public.candidates for update to authenticated
  using (public.owns_event(event_id)) with check (public.owns_event(event_id));
create policy candidates_delete on public.candidates for delete to authenticated
  using (public.owns_event(event_id));

-- La publication et le statut de consentement ne peuvent changer que par le serveur
-- (lien de consentement) ou un super admin. Toute modification du profil par
-- l'organisateur après acceptation renvoie le candidat en attente de consentement.
create or replace function public.guard_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
declare privileged boolean := public.is_super_admin() or auth.role() = 'service_role';
begin
  if not privileged then
    if new.is_published is distinct from old.is_published
       or new.consent_status is distinct from old.consent_status then
      raise exception 'La publication dépend du consentement du candidat';
    end if;
    if (new.display_name, new.bio, new.photo_url, new.video_url, new.social, new.category_id)
       is distinct from (old.display_name, old.bio, old.photo_url, old.video_url, old.social, old.category_id)
       and old.consent_status = 'accepted' then
      new.is_published := false;
      new.consent_status := 'not_sent';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger candidates_guard before update on public.candidates for each row execute function public.guard_candidate();

-- Coordonnées privées et preuve de consentement : jamais publiques
create table public.candidate_private (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  email text,
  phone text,
  consent_token_hash text,
  consent_expires_at timestamptz,
  consent_sent_at timestamptz,
  consent_reminders int not null default 0,
  consent_decided_at timestamptz,
  consent_ip text,
  consent_user_agent text,
  consent_terms_version text,
  consent_snapshot jsonb,
  consent_log jsonb not null default '[]'::jsonb
);
alter table public.candidate_private enable row level security;
create policy candidate_private_read on public.candidate_private for select to authenticated
  using (public.owns_event(event_id));
create policy candidate_private_write on public.candidate_private for insert to authenticated
  with check (public.owns_event(event_id) and consent_token_hash is null);
revoke update on public.candidate_private from authenticated, anon;
grant update (email, phone) on public.candidate_private to authenticated;
create policy candidate_private_update on public.candidate_private for update to authenticated
  using (public.owns_event(event_id)) with check (public.owns_event(event_id));

-- ============ Paiements et votes ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  event_id uuid not null references public.events(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  votes int not null check (votes > 0),
  bonus_votes int not null default 0 check (bonus_votes >= 0),
  amount_xof int not null check (amount_xof > 0),
  phone_hash text not null,
  phone_masked text,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  provider_transaction_id text unique,
  method text,
  provider_payload jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index on public.payments(event_id, status);
create index on public.payments(phone_hash, created_at);
alter table public.payments enable row level security;
create policy payments_read on public.payments for select to authenticated using (public.owns_event(event_id));

create table public.receipts (
  code text primary key,
  kind text not null check (kind in ('vote','ballot')),
  event_id uuid not null references public.events(id) on delete cascade,
  votes int,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
alter table public.receipts enable row level security; -- lecture via verify_receipt() uniquement

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  kind text not null check (kind in ('paid','free')),
  quantity int not null check (quantity > 0),
  payment_id uuid unique references public.payments(id),
  phone_hash text,
  ip_hash text,
  device_hash text,
  receipt_code text references public.receipts(code),
  status text not null default 'valid' check (status in ('valid','frozen','void')),
  created_at timestamptz not null default now()
);
create index on public.votes(event_id, created_at);
create index on public.votes(candidate_id);
create index on public.votes(phone_hash, category_id, created_at);
alter table public.votes enable row level security;
create policy votes_read on public.votes for select to authenticated using (public.owns_event(event_id));

-- Totaux publics (mis à jour atomiquement avec chaque vote)
create table public.candidate_stats (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  paid_votes bigint not null default 0,
  free_votes bigint not null default 0,
  total_votes bigint generated always as (paid_votes + free_votes) stored,
  revenue_xof bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index on public.candidate_stats(event_id);
alter table public.candidate_stats enable row level security;
create policy stats_public_read on public.candidate_stats for select
  using (
    exists (select 1 from public.events e join public.candidates c on c.id = candidate_stats.candidate_id
            where e.id = candidate_stats.event_id and c.is_published
              and e.status in ('published','closed') and e.show_live_results)
    or public.owns_event(event_id)
  );
revoke select (revenue_xof) on public.candidate_stats from anon;

create or replace function public.ensure_candidate_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.candidate_stats (candidate_id, event_id, category_id)
  values (new.id, new.event_id, new.category_id)
  on conflict (candidate_id) do update set category_id = excluded.category_id;
  return new;
end;
$$;
create trigger candidates_stats_row after insert or update of category_id on public.candidates
  for each row execute function public.ensure_candidate_stats();

-- ============ Jury ============
create table public.jury_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  weight numeric(5,2) not null default 1 check (weight > 0),
  max_score int not null default 10 check (max_score between 1 and 100),
  position int not null default 0
);
create table public.jury_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  juror_id uuid not null references public.profiles(id) on delete cascade,
  criterion_id uuid not null references public.criteria(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  comment text,
  updated_at timestamptz not null default now(),
  unique (candidate_id, juror_id, criterion_id)
);
create table public.jury_recusals (
  event_id uuid not null references public.events(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  juror_id uuid not null references public.profiles(id) on delete cascade,
  primary key (candidate_id, juror_id)
);

create or replace function public.is_juror(e uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jury_members where event_id = e and user_id = auth.uid());
$$;

alter table public.jury_members enable row level security;
create policy jury_members_read on public.jury_members for select to authenticated
  using (user_id = auth.uid() or public.owns_event(event_id));
create policy jury_members_write on public.jury_members for all to authenticated
  using (public.owns_event(event_id)) with check (public.owns_event(event_id));

alter table public.criteria enable row level security;
create policy criteria_read on public.criteria for select to authenticated
  using (public.is_juror(event_id) or public.owns_event(event_id));
create policy criteria_write on public.criteria for all to authenticated
  using (public.owns_event(event_id)) with check (public.owns_event(event_id));

alter table public.jury_scores enable row level security;
create policy jury_scores_own on public.jury_scores for all to authenticated
  using (juror_id = auth.uid() and public.is_juror(event_id))
  with check (juror_id = auth.uid() and public.is_juror(event_id)
              and not exists (select 1 from public.jury_recusals r where r.candidate_id = jury_scores.candidate_id and r.juror_id = auth.uid()));
create policy jury_scores_owner_read on public.jury_scores for select to authenticated
  using (public.owns_event(event_id));

alter table public.jury_recusals enable row level security;
create policy recusals_own on public.jury_recusals for all to authenticated
  using (juror_id = auth.uid() or public.owns_event(event_id))
  with check (juror_id = auth.uid() and public.is_juror(event_id));

-- ============ Élections à bulletin secret ============
create table public.electors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  external_id text,
  has_voted boolean not null default false,
  voted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.electors(event_id);
create unique index electors_email_uq on public.electors(event_id, lower(email)) where email is not null;
create unique index electors_phone_uq on public.electors(event_id, phone) where phone is not null;
alter table public.electors enable row level security;
create policy electors_owner on public.electors for select to authenticated using (public.owns_event(event_id));
create policy electors_owner_insert on public.electors for insert to authenticated
  with check (public.owns_event(event_id) and has_voted = false);
create policy electors_owner_delete on public.electors for delete to authenticated
  using (public.owns_event(event_id) and has_voted = false);

-- Le bulletin ne contient AUCUN lien vers l'électeur : le secret du vote est garanti par le schéma.
create table public.ballots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  choices jsonb not null,           -- {"<category_id>": ["<candidate_id>", ...] | []}
  receipt_code text not null references public.receipts(code),
  cast_day date not null default current_date  -- pas d'horodatage précis pour éviter le recoupement
);
create index on public.ballots(event_id);
alter table public.ballots enable row level security; -- aucune lecture directe ; résultats via election_results()

-- ============ OTP, alertes, audit, reversements ============
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  target_hash text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('vote','ballot')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.otp_codes(target_hash, created_at);
alter table public.otp_codes enable row level security;

create table public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.fraud_alerts enable row level security;
create policy fraud_read on public.fraud_alerts for select to authenticated using (public.owns_event(event_id));

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_super_admin());

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id),
  amount_xof int not null check (amount_xof > 0),
  method text not null check (method in ('wave','orange_money','mtn','moov','bank')),
  destination text not null,
  status text not null default 'requested' check (status in ('requested','approved','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.payout_requests enable row level security;
create policy payouts_read on public.payout_requests for select to authenticated
  using (organizer_id = auth.uid() or public.is_super_admin());
create policy payouts_insert on public.payout_requests for insert to authenticated
  with check (organizer_id = auth.uid() and status = 'requested' and public.owns_event(event_id));
create policy payouts_admin_update on public.payout_requests for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
