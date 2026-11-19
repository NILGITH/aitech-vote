"use client";
import { useEffect, useRef } from "react";

/** Fait apparaître son contenu au défilement (respecte la réduction des animations). */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: React.ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "article" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-visible"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error — ref polymorphe
    <Tag ref={ref} className={`av-reveal ${className}`} style={{ "--av-delay": `${delay}s` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
