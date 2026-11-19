import { Shell } from "@/components/admin/Shell";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/(public)/connexion/actions";

export const dynamic = "force-dynamic";

export default async function JuryLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile(["jury", "organizer", "super_admin"]);
  return (
    <Shell nav={[{ href: "/jury", label: "Mes jurys" }]} badge="ESPACE JURY" user={me.full_name || me.email || ""} signOut={signOut}>
      {children}
    </Shell>
  );
}
