export const metadata = { title: "Confidentialité" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold">
      <h1 className="text-3xl font-extrabold">Politique de confidentialité</h1>
      <p className="text-muted">Traitement conforme à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel.</p>
      <h2>Votants</h2>
      <p>Votre numéro sert uniquement à vous envoyer un code de vérification et à appliquer les limites anti-fraude. Il est conservé sous forme hachée (irréversible). Aucun compte n&apos;est créé.</p>
      <h2>Électeurs</h2>
      <p>Le bulletin est enregistré sans aucun lien avec votre identité : l&apos;organisateur sait si vous avez voté, jamais pour qui.</p>
      <h2>Candidats</h2>
      <p>Vos coordonnées (e-mail, téléphone) ne sont jamais publiées. La preuve de votre consentement (date, adresse IP, appareil, informations validées) est conservée pour la durée de l&apos;événement et ses suites.</p>
      <h2>Paiements</h2>
      <p>Les paiements sont traités par Kkiapay. Aitech Vote ne voit ni ne stocke vos données de carte ou de compte Mobile Money.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, suppression : contact@aitech-ci.com</p>
    </article>
  );
}
