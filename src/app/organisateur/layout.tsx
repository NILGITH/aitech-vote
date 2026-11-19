import { Shell } from "@/components/admin/Shell";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/(public)/connexion/actions";

export const dynamic = "force-dynamic";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile(["organizer", "super_admin"]);
  const nav = [
    { href: "/organisateur", label: "Vue d'ensemble", exact: true },
    { href: "/organisateur/evenements", label: "Mes événements" },
    { href: "/organisateur/evenements/nouveau", label: "Nouvel événement", exact: true },
    ...(me.role === "super_admin" ? [{ href: "/admin", label: "Back-office" }] : []),
  ];
  return (
    <Shell nav={nav} badge="ESPACE ORGANISATEUR" user={me.full_name || me.email || ""} signOut={signOut}>
      {me.status === "pending" && (
        <div className="mb-5 rounded-xl border border-[#F3D9A4] bg-[#FFFAEF] p-4 text-sm text-[#6B4700]">
          Votre compte est en attente de validation. Vous pouvez préparer vos événements ; la publication sera possible dès qu&apos;un administrateur aura validé votre compte.
        </div>
      )}
      {children}
    </Shell>
  );
}
