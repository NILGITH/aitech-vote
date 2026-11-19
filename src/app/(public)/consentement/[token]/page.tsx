import { findByToken } from "@/lib/consent";
import { ConsentAction } from "@/components/vote/ConsentAction";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consentement", robots: { index: false } };

export default async function ConsentPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ action?: string }> }) {
  const { token } = await params;
  const a = (await searchParams).action;
  const action = a === "refuser" ? "refuser" : a === "erreur" ? "erreur" : "accepter";
  const found = await findByToken(token).catch(() => null);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-12">
      {!found ? (
        <p role="alert" className="rounded-xl bg-[#FFF6F5] p-4 text-danger">Ce lien n&apos;est plus valide. Demandez à l&apos;organisateur de vous renvoyer une demande.</p>
      ) : (
        <>
          <div className="av-card flex items-center gap-3 p-4">
            <Avatar name={found.c.display_name} src={found.c.photo_url} size={56} />
            <div>
              <div className="font-bold">{found.c.display_name}</div>
              <div className="text-sm text-muted">{found.c.events.title} · {found.c.code}</div>
            </div>
          </div>
          <ConsentAction token={token} action={action} name={found.c.display_name} eventTitle={found.c.events.title} alreadyAccepted={found.c.consent_status === "accepted"} />
        </>
      )}
    </div>
  );
}
