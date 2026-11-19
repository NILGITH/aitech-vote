-- Les fonctions de déclencheur ne doivent pas être appelables via l'API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_event_status() from public, anon, authenticated;
revoke execute on function public.guard_candidate() from public, anon, authenticated;
revoke execute on function public.ensure_candidate_stats() from public, anon, authenticated;
-- is_super_admin, owns_event, event_is_public, is_juror et is_active_organizer restent exécutables :
-- elles sont évaluées dans les politiques RLS et ne renvoient qu'un booléen sur l'appelant.
-- verify_receipt est volontairement public (vérification d'un reçu par son code).
alter function public.event_voting_open(public.events) set search_path = public;
