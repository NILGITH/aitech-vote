/* eslint-disable @next/next/no-img-element */
import { colorFor, initials } from "@/lib/format";

export function Avatar({ name, src, size = 48, radius = 12, className = "", ring }: { name: string; src?: string | null; size?: number; radius?: number; className?: string; ring?: string }) {
  const style: React.CSSProperties = { width: size, height: size, borderRadius: radius, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined, flex: "none" };
  if (src) return <img src={src} alt="" className={`object-cover ${className}`} style={style} loading="lazy" />;
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center font-bold text-white ${className}`}
      style={{ ...style, background: colorFor(name), fontSize: Math.max(12, size * 0.32) }}
    >
      {initials(name)}
    </span>
  );
}
