import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { BigScreen } from "@/components/live/BigScreen";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Écran en direct", robots: { index: false } };

export default async function DirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("*").eq("short_code", code.toUpperCase()).maybeSingle<EventRow>();
  if (!e || !e.modes.includes("live")) notFound();
  const [{ data: cats }, { data: cands }, { data: stats }] = await Promise.all([
    db.from("categories").select("id, name").eq("event_id", e.id).order("position"),
    db.from("candidates").select("id, display_name, code, photo_url, category_id").eq("event_id", e.id).eq("is_published", true),
    db.from("candidate_stats").select("candidate_id, category_id, total_votes").eq("event_id", e.id),
  ]);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/e/${e.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 512, color: { dark: "#0B1B33", light: "#FFFFFF" } });
  return (
    <BigScreen
      eventId={e.id}
      title={e.title}
      categories={cats ?? []}
      candidates={cands ?? []}
      initial={(stats ?? []).map((s) => ({ ...s, total_votes: Number(s.total_votes) }))}
      qr={qr}
      url={url}
      closesAt={e.vote_closes_at}
    />
  );
}
