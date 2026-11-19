import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FONT_STACKS, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: "Aitech Vote — concours, awards et élections", template: "%s · Aitech Vote" },
  description:
    "Votez en 10 secondes pour vos candidats : paiement Wave, Orange Money, MTN, Moov ou carte, reçus vérifiables, élections à bulletin secret.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B1B33" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getSettings();
  const animScale = theme.animation === "dynamic" ? 0.6 : 1;
  const style = {
    "--av-primary": theme.primary,
    "--av-accent": theme.accent,
    "--av-ink": theme.ink,
    "--av-heading": FONT_STACKS[theme.headingFont] ?? FONT_STACKS.Sora,
    "--av-radius": `${theme.radius}px`,
    "--av-anim": String(animScale),
  } as React.CSSProperties;

  return (
    <html lang="fr" style={style} data-anim={theme.animation}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&family=Poppins:wght@600;700;800&family=Montserrat:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
