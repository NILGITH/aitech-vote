# Aitech Vote

Plateforme de vote pour concours, awards et élections (AITECH Côte d'Ivoire).

- Vote public payant (packs, Wave / Orange Money / MTN / Moov / carte via **Kkiapay**), vérifié côté serveur
- Vote gratuit contrôlé (code WhatsApp via **Kapso**, quota quotidien)
- Jury avec grille de critères pondérés, pondération jury / public
- Élections à bulletin secret (liste électorale, reçu de vérification, résultats scellés)
- Écran géant en direct (temps réel Supabase, QR code)
- Consentement obligatoire des candidats par e-mail (**Resend**) avant publication
- Back-office : modules, tarifs et commissions, apparence, clés API (Resend, Kkiapay par événement, Kapso), candidats, organisateurs, paiements, anti-fraude, journal d'audit

## Pile technique
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Realtime, RLS)

## Démarrage
```bash
cp .env.example .env.local   # renseigner les valeurs
npm install
npm run dev
```
Les migrations SQL sont dans `supabase/migrations` (déjà appliquées sur le projet Supabase « aitech-vote »).

## Sécurité
- Le navigateur n'écrit jamais de vote, de paiement ni de bulletin : routes serveur + fonctions SQL atomiques.
- RLS stricte sur toutes les tables ; coordonnées des candidats et recettes isolées.
- Clés API chiffrées en AES-256-GCM (`APP_ENCRYPTION_KEY`) avant stockage.
- Numéros et IP hachés (HMAC, `APP_SIGNING_SECRET`).

## Premier administrateur
Après inscription, exécuter dans Supabase (SQL) :
```sql
update public.profiles set role = 'super_admin', status = 'active' where email = 'votre@email';
```
