-- Un organisateur en attente de validation peut préparer des brouillons ;
-- la publication reste bloquée par guard_event_status tant que le compte n'est pas actif.
create or replace function public.is_organizer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('organizer','super_admin') and status <> 'suspended');
$$;
drop policy events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (organizer_id = auth.uid() and public.is_organizer() and status in ('draft','pending_review'));
