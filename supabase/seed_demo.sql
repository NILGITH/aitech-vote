-- Données de démonstration Aitech Vote (personnes fictives). Rejouable.
create or replace function pg_temp.rcode() returns text language sql volatile as $$
  select 'AV' || substr(a, 1, 1) || '-' || substr(a, 2, 3) || '-' || substr(a, 5, 3)
  from (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') a
        from generate_series(1, 7)) s;
$$;
create or replace function pg_temp.slugify(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(translate(t, 'àâäéèêëîïôöùûüçÀÂÉÈÊÎÏÔÙÛÇ''’«»—', 'aaaeeeeiioouuucAAEEEIIOUUC      ')), '[^a-z0-9]+', '-', 'g'));
$$;
create or replace function pg_temp.mkuser(p_email text, p_name text, p_org text, p_role public.user_role, p_status public.account_status) returns uuid
language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email, '', now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name, 'organization_name', p_org),
          now() - (20 + floor(random() * 40)) * interval '1 day', now());
  update public.profiles set role = p_role, status = p_status, phone = '+22507' || (10000000 + floor(random() * 89999999))::bigint where id = uid;
  return uid;
end $$;

do $seed$
declare
  data jsonb := $json$[{"key":"mec","org":"admin","slug":"miss-etudiante-ci-2026","code":"MEC","type":"beauty","status":"published","title":"Miss Étudiante Côte d'Ivoire 2026","location":"Palais de la Culture, Abidjan","description":"Dix étudiantes venues de toutes les universités du pays. Votez pour votre favorite avant la grande finale du 5 décembre.","modes":["paid","free"],"price":100,"closesInDays":12,"opensDaysAgo":10,"theme":"beauty","cats":[{"name":"Finalistes","desc":"Les dix finalistes nationales","prefix":"MEC","cands":[["Aya Kouassi","Étudiante en droit à l'Université FHB, passionnée de mode éthique."],["Mariam Diabaté","Ingénieure en herbe à l'INP-HB, ambassadrice des filles dans la tech."],["Grâce N'Guessan","Future médecin, bénévole dans une ONG de santé maternelle."],["Awa Sanogo","Étudiante en communication, créatrice de contenu à Bouaké."],["Laetitia Yao","Danseuse et étudiante en gestion à l'Université de Cocody."],["Fanta Ouattara","Étudiante en agronomie, porte un projet de jardins urbains."],["Christelle Aka","Étudiante en lettres modernes, slameuse et conteuse."],["Kadiatou Cissé","Étudiante en finance, fondatrice d'un club d'épargne étudiant."],["Esther Djè","Étudiante en architecture à Yamoussoukro."],["Salimata Touré","Étudiante en pharmacie, engagée pour l'accès aux soins."]]}]},{"key":"ima","org":"admin","slug":"ivoire-music-awards-2026","code":"IMA","type":"awards","status":"published","title":"Ivoire Music Awards 2026","location":"Sofitel Hôtel Ivoire, Abidjan","description":"La grande soirée de la musique ivoirienne. Le public compte pour 60 %, le jury de professionnels pour 40 %.","modes":["paid","jury"],"jury":40,"price":200,"closesInDays":20,"opensDaysAgo":15,"theme":"awards","criteria":[["Originalité",2,10],["Qualité vocale",2,10],["Présence scénique",1,10],["Impact public",1,10]],"cats":[{"name":"Artiste féminine de l'année","desc":null,"prefix":"FEM","cands":[["Séréna Bléhoué","Voix soul et zouglou, 3 albums."],["Djéné Kaba","Reine de l'afropop, révélée en 2022."],["Mia Akissi","Coupé-décalé au féminin."],["Rokia Fofana","Mandingue moderne et kora."],["Inès Gnahoré","Gospel et afro-jazz."]]},{"name":"Artiste masculin de l'année","desc":null,"prefix":"MAS","cands":[["Black Kôrô","Rap ivoire et nouchi, tubes de l'été."],["Didi Yobouet","Zouglou engagé."],["Prince Zadi","Afrobeats et coupé-décalé."],["Lass Konaté","Reggae mandingue."],["Junior Ehui","Afro-R&B."]]},{"name":"Révélation de l'année","desc":null,"prefix":"REV","cands":[["Kiki Lagune","Premier single, 5 millions de vues."],["Tidiane MC","Rap de Yopougon."],["Les Jumelles Assalé","Duo de chant traditionnel revisité."],["Ozzy Bamba","Afro-électro."],["Naya Brou","Pop urbaine."]]},{"name":"Meilleur clip","desc":null,"prefix":"CLP","cands":[["« Abidjan la nuit » — Prince Zadi","Réalisé par Studio Lagune."],["« Maman » — Séréna Bléhoué","Tourné à Grand-Bassam."],["« Gbêkê » — Didi Yobouet","Plan-séquence à Bouaké."],["« Wari » — Djéné Kaba","Chorégraphie de 40 danseurs."]]}]},{"key":"ats","org":"admin","slug":"abidjan-talent-show-2026","code":"ATS","type":"talent","status":"published","title":"Abidjan Talent Show 2026","location":"Canal Olympia, Riviera","description":"Chant, danse, humour, magie : huit finalistes, une seule couronne. Vote gratuit chaque jour et vote en direct le soir de la finale.","modes":["paid","free","live"],"price":100,"closesInDays":5,"opensDaysAgo":8,"theme":"talent","cats":[{"name":"Finalistes","desc":null,"prefix":"ATS","cands":[["Yannick « Magic » Boni","Magicien close-up."],["Dorcas Kouamé","Chanteuse lyrique."],["Crew Zinzin","Collectif de danse urbaine (6 danseurs)."],["Ali Kéita","Humoriste, sketchs sur la vie à Abobo."],["Sandrine Loba","Acrobate et contorsionniste."],["DJ Kôkô","Beatmaker en live."],["Mélissa Dogbo","Violoniste afro-classique."],["Moussa & Fils","Percussions traditionnelles."]]}]},{"key":"bde","org":"bde","slug":"election-bde-inphb-2026","code":"BDE","type":"election","status":"published","title":"Élection du Bureau des Élèves INP-HB 2026","location":"INP-HB, Yamoussoukro","description":"Élection à bulletin secret du nouveau bureau. Un électeur, un vote. Résultats publiés à la clôture.","modes":["election"],"price":0,"closesInDays":3,"opensDaysAgo":2,"theme":"election","electors":150,"voted":92,"cats":[{"name":"Présidence","desc":null,"prefix":"PRE","cands":[["Liste Horizon — Kevin Amon","Programme : wifi campus, bourses de mobilité."],["Liste Unité — Prisca Tanoh","Programme : restauration, sport, entrepreneuriat."],["Liste Élan — Hamed Soro","Programme : transport, logements étudiants."]]},{"name":"Secrétariat général","desc":null,"prefix":"SEC","cands":[["Joëlle Adou","Promotion 2027, génie civil."],["Brice Kacou","Promotion 2027, informatique."]]},{"name":"Trésorerie","desc":null,"prefix":"TRE","cands":[["Raïssa Méité","Promotion 2028, finance."],["Serge Allou","Promotion 2027, statistiques."]]}]},{"key":"pit","org":"kouadio","slug":"prix-innovation-tech-2025","code":"PIT","type":"awards","status":"closed","title":"Prix de l'Innovation Tech 2025","location":"Seen Hotel, Plateau","description":"Récompense les startups ivoiriennes les plus innovantes. Jury 50 % / public 50 %. Vote clôturé, résultats publiés.","modes":["paid","jury"],"jury":50,"price":100,"closesInDays":-14,"opensDaysAgo":45,"theme":"tech","criteria":[["Innovation",3,10],["Impact social",2,10],["Modèle économique",2,10],["Équipe",1,10]],"cats":[{"name":"Startup de l'année","desc":null,"prefix":"STA","cands":[["AgriTrack CI","Traçabilité du cacao par satellite."],["SantéDirect","Téléconsultation par SMS."],["Wôrô Wôrô App","Covoiturage urbain."],["EduKids","Soutien scolaire en langues locales."]]},{"name":"Fintech","desc":null,"prefix":"FIN","cands":[["TontinePay","Tontines digitales sécurisées."],["KashBox","Caisse enregistreuse mobile pour commerçants."],["MicroAssur","Micro-assurance santé à 500 FCFA/mois."],["NeoBanque Lagune","Compte bancaire 100 % mobile."]]}]},{"key":"tss","org":"fss","slug":"trophees-sport-scolaire-2026","code":"TSS","type":"awards","status":"pending_review","title":"Trophées du Sport Scolaire 2026","location":"Stade Félix Houphouët-Boigny","description":"Élisez les meilleurs sportifs scolaires de l'année. En attente de validation par l'administrateur.","modes":["paid","free"],"price":50,"closesInDays":30,"opensDaysAgo":-2,"theme":"sport","consent":"pending","cats":[{"name":"Sportif de l'année","desc":null,"prefix":"SPO","cands":[["Ismaël Diomandé","Athlétisme, 100 m."],["Ange Kassi","Basketball."],["Junior Tapé","Football."],["Océane Gbané","Natation."]]}]},{"key":"slam","org":"admin","slug":"concours-slam-poesie-2026","code":"SLAM","type":"talent","status":"draft","title":"Concours Slam & Poésie 2026","location":"Institut Français, Plateau","description":"Brouillon : à compléter avant publication.","modes":["paid","jury"],"jury":30,"price":100,"closesInDays":40,"opensDaysAgo":-10,"theme":"slam","consent":"not_sent","cats":[{"name":"Slameurs","desc":null,"prefix":"SLM","cands":[["Amani Le Poète","Slam engagé."],["Rose Kipré","Poésie en nouchi."],["Bakary Les Mots","Spoken word."]]}]}]$json$::jsonb;
  admin_id uuid := (select id from auth.users where email = 'admin@aitech-ci.com');
  org jsonb := '{}'::jsonb;
  jur uuid[];
  ev jsonb; cat jsonb; cand jsonb; cr jsonb;
  eid uuid; catid uuid; cid uuid; pid uuid; crid uuid; oid uuid;
  opens timestamptz; closes timestamptz; vend timestamptz;
  ci int; i int; k int; n int; v int; b int; r float; price int;
  consent public.consent_status; published boolean; code text; ph text; created timestamptz; st text;
  cands uuid[]; cats uuid[]; pops float[]; tot float; acc float; choice jsonb; j uuid; base float;
  firsts text[] := array['Koffi','Aya','Yao','Adjoua','Kouamé','Affoué','Moussa','Fatoumata','Drissa','Mariam','Jean-Marc','Bintou','Hervé','Nadège','Arsène','Clarisse','Ousmane','Aminata','Didier','Rachelle'];
  lasts text[] := array['Kouassi','Konan','Koné','Traoré','Ouattara','Bamba','Yao','N''Dri','Coulibaly','Diallo','Gnagne','Aka','Kra','Sylla','Tanoh','Assi','Brou','Kipré'];
  methods text[] := array['wave','wave','orange_money','orange_money','mtn','moov','card'];
  fn text; ln text;
begin
  if admin_id is null then raise exception 'compte admin introuvable'; end if;
  perform setseed(0.2026);

  -- Nettoyage d'un éventuel passage précédent
  delete from public.payout_requests where event_id in (select id from public.events where slug in (select e->>'slug' from jsonb_array_elements(data) e));
  delete from public.audit_log where details ? 'demo';
  delete from public.votes where event_id in (select id from public.events where slug in (select e->>'slug' from jsonb_array_elements(data) e));
  delete from public.payments where event_id in (select id from public.events where slug in (select e->>'slug' from jsonb_array_elements(data) e));
  delete from public.events where slug in (select e->>'slug' from jsonb_array_elements(data) e);
  delete from public.receipts r where not exists (select 1 from public.events e where e.id = r.event_id);
  delete from public.subscriptions where organizer_id in (select id from auth.users where email like '%.demo' or email like '%@demo.ci');
  delete from auth.users where email like '%.demo' or email like '%@demo.ci';

  -- Organisateurs et jurés fictifs (aucun mot de passe : connexion impossible)
  org := jsonb_build_object('admin', admin_id,
    'kouadio', pg_temp.mkuser('contact@kouadio-events.demo', 'Serge Kouadio', 'Kouadio Events', 'organizer', 'active'),
    'bde', pg_temp.mkuser('bde@inphb.demo', 'Aïcha Traoré', 'BDE INP-HB', 'organizer', 'active'),
    'fss', pg_temp.mkuser('fss@sport-scolaire.demo', 'Marc Gbagbo-Yao', 'Fédération Scolaire de Sport', 'organizer', 'pending'),
    'lagune', pg_temp.mkuser('hello@studio-lagune.demo', 'Nadia Coulibaly', 'Studio Lagune', 'organizer', 'pending'));
  insert into public.subscriptions (organizer_id, plan_id, status, starts_at, ends_at)
  select (org->>'kouadio')::uuid, id, 'active', now() - interval '15 days', now() + interval '15 days' from public.plans where slug = 'pro';
  insert into public.subscriptions (organizer_id, plan_id, status, starts_at, ends_at)
  select (org->>'bde')::uuid, id, 'active', now() - interval '12 days', null from public.plans where slug = 'free';
  jur := array[pg_temp.mkuser('jury.bamba@demo.ci', 'Fatou Bamba', null, 'jury', 'active'),
               pg_temp.mkuser('jury.kone@demo.ci', 'Ibrahim Koné', null, 'jury', 'active'),
               pg_temp.mkuser('jury.essoh@demo.ci', 'Clarisse Essoh', null, 'jury', 'active')];

  for ev in select * from jsonb_array_elements(data) loop
    opens := now() - (ev->>'opensDaysAgo')::int * interval '1 day';
    closes := now() + (ev->>'closesInDays')::int * interval '1 day';
    vend := least(now(), closes);
    price := (ev->>'price')::int;
    oid := (org->>(ev->>'org'))::uuid;
    insert into public.events (organizer_id, slug, short_code, title, description, event_type, cover_url, location, starts_at,
                               vote_opens_at, vote_closes_at, status, modes, jury_weight, price_per_vote_xof, require_otp,
                               free_votes_per_day, show_live_results, created_at)
    values (oid, ev->>'slug', ev->>'code', ev->>'title', ev->>'description', ev->>'type', '/demo/covers/' || (ev->>'slug') || '.svg',
            ev->>'location', closes + interval '1 day', opens, closes, (ev->>'status')::public.event_status,
            array(select jsonb_array_elements_text(ev->'modes')), coalesce((ev->>'jury')::int, 0), price, true, 1, true,
            opens - interval '7 days')
    returning id into eid;

    k := 0;
    for cr in select * from jsonb_array_elements(coalesce(ev->'criteria', '[]'::jsonb)) loop
      insert into public.criteria (event_id, name, weight, max_score, position)
      values (eid, cr->>0, (cr->>1)::numeric, (cr->>2)::int, k);
      k := k + 1;
    end loop;

    cands := '{}'; cats := '{}'; pops := '{}';
    ci := 0;
    for cat in select * from jsonb_array_elements(ev->'cats') loop
      insert into public.categories (event_id, name, description, max_choices, position)
      values (eid, cat->>'name', cat->>'desc', 1, ci) returning id into catid;
      i := 0;
      for cand in select * from jsonb_array_elements(cat->'cands') loop
        i := i + 1;
        code := (cat->>'prefix') || '-' || lpad(i::text, 2, '0');
        consent := coalesce(ev->>'consent', 'accepted')::public.consent_status;
        if ev->>'code' = 'IMA' and code = 'REV-05' then consent := 'pending'; end if;
        if ev->>'code' = 'IMA' and code = 'CLP-04' then consent := 'refused'; end if;
        published := consent = 'accepted' and ev->>'status' in ('published', 'closed');
        insert into public.candidates (event_id, category_id, code, display_name, bio, photo_url, social, position, consent_status, is_published)
        values (eid, catid, code, cand->>0, cand->>1, '/demo/avatars/' || lower(ev->>'code') || '-' || lower(code) || '.svg',
                jsonb_build_object('instagram', '@' || left(replace(pg_temp.slugify(cand->>0), '-', ''), 18)), i - 1, consent, published)
        returning id into cid;
        created := opens - (1 + random() * 5) * interval '1 day';
        insert into public.candidate_private (candidate_id, event_id, email, phone, consent_sent_at, consent_decided_at, consent_terms_version,
                                              consent_ip, consent_user_agent, consent_expires_at, consent_log)
        values (cid, eid, left(pg_temp.slugify(cand->>0), 20) || '@exemple.ci', '+22505' || (10000000 + floor(random() * 89999999))::bigint,
                case when consent = 'not_sent' then null else created - interval '1 day' end,
                case when consent in ('accepted', 'refused') then created end,
                case when consent = 'accepted' then '2026-11' end,
                case when consent = 'accepted' then '196.47.x.x' end,
                case when consent = 'accepted' then 'Mozilla/5.0 (Android 14)' end,
                case when consent = 'pending' then now() + interval '6 days' end,
                case consent when 'accepted' then jsonb_build_array(jsonb_build_object('at', created, 'action', 'accepted', 'terms', '2026-11'))
                             when 'refused' then jsonb_build_array(jsonb_build_object('at', created, 'action', 'refused'))
                             when 'pending' then jsonb_build_array(jsonb_build_object('at', now() - interval '1 day', 'action', 'sent'))
                             else '[]'::jsonb end);
        if published then
          cands := cands || cid; cats := cats || catid; pops := pops || (power(random(), 1.6) + 0.08);
        end if;
      end loop;
      ci := ci + 1;
    end loop;

    -- Votes payants / gratuits
    if array_length(cands, 1) > 0 and not (ev->'modes') ? 'election' then
      tot := 0; for k in 1..array_length(pops, 1) loop tot := tot + pops[k]; end loop;
      if (ev->'modes') ? 'paid' then
        n := 260 + floor(random() * 160)::int;
        for i in 1..n loop
          r := random() * tot; acc := 0; k := 1;
          while k < array_length(pops, 1) loop acc := acc + pops[k]; exit when acc >= r; k := k + 1; end loop;
          r := random();
          if r < 0.3 then v := 1; b := 0; elsif r < 0.6 then v := 5; b := 0; elsif r < 0.85 then v := 10; b := 1; else v := 50; b := 8; end if;
          created := opens + power(random(), 0.7) * (vend - opens);
          r := random(); st := case when r < 0.05 then 'failed' when r < 0.07 then 'pending' else 'success' end;
          ph := md5(random()::text);
          insert into public.payments (reference, event_id, category_id, candidate_id, votes, bonus_votes, amount_xof, phone_hash, phone_masked,
                                       status, provider_transaction_id, method, failure_reason, created_at, confirmed_at)
          values ('PAY-' || (ev->>'code') || '-' || lpad(i::text, 5, '0'), eid, cats[k], cands[k], v, b, v * price, ph,
                  '+225 07 •• •• ' || lpad(floor(random() * 100)::text, 2, '0') || ' ' || lpad(floor(random() * 100)::text, 2, '0'),
                  st, case when st = 'success' then 'kkp_demo_' || substr(md5(random()::text), 1, 16) end,
                  methods[1 + floor(random() * 7)::int], case when st = 'failed' then 'payment_declined' end,
                  created, case when st = 'success' then created + interval '40 seconds' end)
          returning id into pid;
          if st = 'success' then
            code := pg_temp.rcode();
            insert into public.receipts (code, kind, event_id, votes, fingerprint, created_at) values (code, 'vote', eid, v + b, md5(random()::text), created);
            insert into public.votes (event_id, category_id, candidate_id, kind, quantity, payment_id, phone_hash, receipt_code, created_at)
            values (eid, cats[k], cands[k], 'paid', v + b, pid, ph, code, created);
          end if;
        end loop;
      end if;
      if (ev->'modes') ? 'free' then
        n := 400 + floor(random() * 300)::int;
        for i in 1..n loop
          r := random() * tot; acc := 0; k := 1;
          while k < array_length(pops, 1) loop acc := acc + pops[k]; exit when acc >= r; k := k + 1; end loop;
          insert into public.votes (event_id, category_id, candidate_id, kind, quantity, phone_hash, ip_hash, created_at)
          values (eid, cats[k], cands[k], 'free', 1, md5(random()::text), md5(random()::text), opens + random() * (vend - opens));
        end loop;
      end if;
    end if;

    -- Jury
    if jsonb_array_length(coalesce(ev->'criteria', '[]'::jsonb)) > 0 then
      foreach j in array jur loop insert into public.jury_members (event_id, user_id) values (eid, j); end loop;
      if array_length(cands, 1) > 0 then
        for k in 1..array_length(cands, 1) loop
          base := 4 + random() * 5;
          foreach j in array jur loop
            if j = jur[3] and random() < 0.08 then
              insert into public.jury_recusals (event_id, candidate_id, juror_id) values (eid, cands[k], j);
              continue;
            end if;
            if ev->>'status' = 'published' and j = jur[2] and random() < 0.4 then continue; end if;
            insert into public.jury_scores (event_id, candidate_id, juror_id, criterion_id, score, comment)
            select eid, cands[k], j, c.id, least(c.max_score, greatest(1, round(base + (random() - 0.5) * 3))),
                   case when random() < 0.15 then (array['Très belle prestation.','Peut mieux faire sur la régularité.','Coup de cœur du jury.','Dossier solide.'])[1 + floor(random() * 4)::int] end
            from public.criteria c where c.event_id = eid;
          end loop;
        end loop;
      end if;
    end if;

    -- Élection : liste électorale et bulletins (sans lien avec l'électeur)
    if (ev->'modes') ? 'election' then
      for i in 1..(ev->>'electors')::int loop
        fn := firsts[1 + floor(random() * array_length(firsts, 1))::int];
        ln := lasts[1 + floor(random() * array_length(lasts, 1))::int];
        insert into public.electors (event_id, full_name, email, external_id, has_voted, voted_at)
        values (eid, fn || ' ' || ln, pg_temp.slugify(fn) || '.' || pg_temp.slugify(ln) || i || '@inphb.demo', 'INP' || (26000 + i),
                i <= (ev->>'voted')::int, case when i <= (ev->>'voted')::int then now() - random() * interval '2 days' end);
      end loop;
      for i in 1..(ev->>'voted')::int loop
        choice := '{}'::jsonb;
        for catid in select id from public.categories where event_id = eid loop
          select coalesce(jsonb_agg(x.id), '[]'::jsonb) into cand from (
            select c.id from public.candidates c where c.category_id = catid
            order by random() * (1 + c.position * 0.35) limit (case when random() < 0.03 then 0 else 1 end)) x;
          choice := choice || jsonb_build_object(catid::text, cand);
        end loop;
        code := pg_temp.rcode();
        insert into public.receipts (code, kind, event_id, votes, fingerprint, created_at) values (code, 'ballot', eid, null, md5(random()::text), now() - random() * interval '40 hours');
        insert into public.ballots (event_id, choices, receipt_code, cast_day) values (eid, choice, code, current_date - floor(random() * 2)::int);
      end loop;
    end if;
  end loop;

  -- Statistiques et revenus recalculés à partir des votes
  update public.candidate_stats cs set paid_votes = coalesce(v.p, 0), free_votes = coalesce(v.f, 0), updated_at = now()
  from (select candidate_id, sum(quantity) filter (where kind = 'paid') p, sum(quantity) filter (where kind = 'free') f
        from public.votes where status = 'valid' group by candidate_id) v
  where v.candidate_id = cs.candidate_id;
  insert into public.candidate_revenue (candidate_id, event_id, revenue_xof)
  select candidate_id, event_id, sum(amount_xof) from public.payments where status = 'success' group by candidate_id, event_id
  on conflict (candidate_id) do update set revenue_xof = excluded.revenue_xof;

  -- Alertes anti-fraude, reversements, journal
  insert into public.fraud_alerts (event_id, kind, details, status, created_at)
  select e.id, a.kind, a.details::jsonb, a.status, now() - a.ago::interval
  from (values ('MEC','burst_same_phone','{"phone":"+225 07 •• •• 41 18","payments":14,"window":"10 min"}','open','3 hours'),
               ('MEC','free_vote_farm','{"attempts":63,"blocked":61}','open','1 day'),
               ('IMA','failed_payments_spike','{"failed":22,"window":"1 h","method":"card"}','open','6 hours'),
               ('ATS','velocity','{"candidate":"ATS-04","votes_per_min":120}','resolved','4 days'),
               ('PIT','burst_same_phone','{"phone":"+225 05 •• •• 77 02","payments":9}','dismissed','20 days')) a(code, kind, details, status, ago)
  join public.events e on e.short_code = a.code;

  insert into public.payout_requests (organizer_id, event_id, amount_xof, method, destination, status, admin_note, created_at, processed_at)
  select e.organizer_id, e.id, a.amount, a.method, a.dest, a.status, a.note, now() - a.ago::interval, case when a.status <> 'requested' then now() - a.ago::interval + interval '20 hours' end
  from (values ('PIT',450000,'wave','+225 07 •• •• 12 34','paid','Virement Wave effectué','10 days'),
               ('PIT',120000,'bank','CI93 •••• •••• 4521','approved',null,'2 days'),
               ('MEC',150000,'orange_money','+225 07 •• •• 88 10','requested',null,'5 hours'),
               ('IMA',300000,'wave','+225 01 •• •• 45 67','rejected','Solde disponible insuffisant après commission','3 days')) a(code, amount, method, dest, status, note, ago)
  join public.events e on e.short_code = a.code;

  insert into public.audit_log (actor_id, action, entity, entity_id, details, created_at)
  select coalesce((org->>a.actor)::uuid, admin_id), a.action, a.entity, a.eid, (a.details || '{"demo":true}')::jsonb, now() - a.ago::interval
  from (values ('admin','organizer.validate','profile','Kouadio Events','{"status":"active"}'::jsonb,'30 days'),
               ('admin','organizer.validate','profile','BDE INP-HB','{"status":"active"}','12 days'),
               ('admin','plan.update','plan','pro','{"price_xof":25000,"commission_pct":10}','9 days'),
               ('admin','event.publish','event','MEC','{"title":"Miss Étudiante Côte d''Ivoire 2026"}','10 days'),
               ('admin','event.publish','event','IMA','{"title":"Ivoire Music Awards 2026"}','15 days'),
               ('admin','appearance.update','site_settings','1','{"field":"theme"}','6 days'),
               ('admin','api_key.save','api_credentials','kkiapay','{"scope":"default"}','5 days'),
               ('admin','consent.resend','candidate','REV-05','{"event":"IMA"}','1 day'),
               ('kouadio','payout.request','payout','PIT','{"amount_xof":450000}','10 days'),
               ('admin','payout.paid','payout','PIT','{"amount_xof":450000,"method":"wave"}','9 days'),
               ('admin','fraud.resolve','fraud_alert','ATS','{"kind":"velocity"}','4 days'),
               ('bde','electors.import','event','BDE','{"count":150}','3 days')) a(actor, action, entity, eid, details, ago);
end
$seed$;

select e.short_code, e.status, count(distinct c.id) candidats,
       (select count(*) from public.payments p where p.event_id = e.id) paiements,
       (select coalesce(sum(total_votes),0) from public.candidate_stats s where s.event_id = e.id) votes,
       (select count(*) from public.ballots b where b.event_id = e.id) bulletins
from public.events e left join public.candidates c on c.event_id = e.id group by e.id order by e.created_at;
