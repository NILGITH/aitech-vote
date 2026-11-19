import { Shell } from "@/components/admin/Shell";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/(public)/connexion/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Back-office", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const nav = [
    { href: "/admin", label: "Vue d'ensemble", exact: true },
    { href: "/admin/tarifs", label: "Tarifs & commissions" },
    { href: "/admin/apparence", label: "Apparence du site" },
    { href: "/admin/cles-api", label: "Clés API" },
    { href: "/admin/candidats", label: "Candidats & consentements" },
    { href: "/admin/organisateurs", label: "Organisateurs" },
    { href: "/admin/evenements", label: "Événements" },
    { href: "/admin/paiements", label: "Paiements & reversements" },
    { href: "/admin/anti-fraude", label: "Anti-fraude" },
    { href: "/admin/journal", label: "Journal d'audit" },
    { href: "/organisateur", label: "Espace organisateur" },
  ];
  return (
    <Shell nav={nav} badge="SUPER ADMINISTRATEUR" user={me.full_name || me.email || ""} signOut={signOut} dark>
      {children}
    </Shell>
  );
}
