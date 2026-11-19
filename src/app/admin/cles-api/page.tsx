import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ApiKeyCard, type CredRow } from "@/components/admin/ApiKeyCard";
import { Badge } from "@/components/ui/Field";
import { env } from "@/lib/env";

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<{ evenement?: string }> }) {
  const eventId = (await searchParams).evenement ?? null;
  const db = createAdminClient();
  const [{ data: creds }, { data: events }] = await Promise.all([
    db.from("api_credentials").select("provider, event_id, public_config, secret_hints, is_active, last_test_at, last_test_ok, updated_at"),
    db.from("events").select("id, title, status, modes").neq("status", "archived").order("created_at", { ascending: false }),
  ]);
  const find = (p: string, e: string | null) => ((creds ?? []).find((c) => c.provider === p && (c.event_id ?? null) === e) ?? null) as CredRow;
  const webhook = `${env.siteUrl()}/api/webhooks/kkiapay`;
  const payEvents = (events ?? []).filter((e) => !e.modes.includes("election"));
  const selected = payEvents.find((e) => e.id === eventId);

  return (
    <>
      <PageTitle title="Clés API" sub="Resend pour les e-mails, Kapso pour WhatsApp, Kkiapay pour les paiements (par défaut ou par événement)." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ApiKeyCard provider="resend" eventId={null} row={find("resend", null)} />
        <ApiKeyCard provider="kapso" eventId={null} row={find("kapso", null)} />
        <ApiKeyCard provider="kkiapay" eventId={null} row={find("kkiapay", null)} title="Kkiapay — compte par défaut de la plateforme" webhookUrl={webhook} />
        <section className="av-card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-[17px] font-bold">Kkiapay par événement</h2>
          <p className="m-0 text-[13px] text-muted">Un événement peut encaisser sur son propre compte Kkiapay. Sans clé propre, il utilise le compte par défaut.</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {payEvents.map((e) => {
              const own = find("kkiapay", e.id);
              return (
                <li key={e.id}>
                  <Link href={`?evenement=${e.id}#evenement`} className={`flex items-center gap-3 rounded-xl p-3 text-sm transition-colors ${eventId === e.id ? "bg-[#E8F0FD]" : "hover:bg-bg"}`}>
                    <span className="flex-1 font-semibold">{e.title}</span>
                    {own ? <Badge tone="green">Clé propre</Badge> : <Badge>Compte par défaut</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!payEvents.length && <p className="m-0 text-sm text-muted">Aucun événement payant.</p>}
        </section>
      </div>
      {selected && (
        <div id="evenement" className="mt-5">
          <ApiKeyCard provider="kkiapay" eventId={selected.id} row={find("kkiapay", selected.id)} title={`Kkiapay — ${selected.title}`} webhookUrl={webhook} />
        </div>
      )}
    </>
  );
}
