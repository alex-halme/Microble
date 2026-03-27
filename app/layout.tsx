import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import TopNav from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Microble",
  description: "A daily clinical microbiology case. Identify the causative organism.",
  openGraph: {
    title: "Microble",
    description: "Can you identify the causative organism from five clinical clues?",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light", background: "#f5f5f7" }}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body style={{ background: "#f5f5f7" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderBottom: "1px solid rgba(217, 217, 222, 0.6)",
            background: "rgba(245, 245, 247, 0.92)",
            backdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "9px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <a
              href="/"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--fg)",
                textDecoration: "none",
                letterSpacing: "-0.03em",
              }}
            >
              Microble
            </a>

            <TopNav />
          </div>
        </header>

        <main
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "16px 24px 16px",
          }}
        >
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
