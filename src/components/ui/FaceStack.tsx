import { Avatar } from "@/components/ui/Avatar";

/** Pile d'avatars qui se chevauchent, avec un compteur « +N ». */
export function FaceStack({ faces, total, size = 34, ring = "#fff" }: { faces: { name: string; src: string | null }[]; total?: number; size?: number; ring?: string }) {
  if (!faces.length) return null;
  const extra = (total ?? faces.length) - faces.length;
  return (
    <span className="flex items-center">
      {faces.map((f, i) => (
        <span key={i} className="av-scale-in" style={{ marginLeft: i ? -size * 0.32 : 0, "--av-delay": `${0.25 + i * 0.08}s` } as React.CSSProperties}>
          <Avatar name={f.name} src={f.src} size={size} radius={999} ring={ring} />
        </span>
      ))}
      {extra > 0 && (
        <span className="ml-1.5 rounded-full bg-[rgba(11,27,51,.75)] px-2 py-1 text-xs font-bold text-white">+{extra}</span>
      )}
    </span>
  );
}
