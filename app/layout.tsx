import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import TopNav from "@/components/TopNav";
import packageJson from "../package.json";
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

const APP_COMMIT_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const APP_VERSION_LABEL = APP_COMMIT_SHA
  ? `v${packageJson.version} (${APP_COMMIT_SHA})`
  : `v${packageJson.version}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light", background: "#f5f5f7" }}>
      <head>
        <meta name="color-scheme" content="light" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
      </head>
      <body style={{ background: "#f5f5f7" }}>
        <header
          className="site-header"
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
            className="site-header-inner"
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "9px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                minWidth: 0,
                flexWrap: "wrap",
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

              <span
                aria-label={`Application version ${APP_VERSION_LABEL}`}
                style={{
                  fontSize: "11px",
                  lineHeight: 1.2,
                  fontWeight: 500,
                  color: "var(--fg-3)",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                  opacity: 0.85,
                }}
              >
                {APP_VERSION_LABEL}
              </span>
            </div>

            <TopNav />
          </div>
        </header>

        <main
          className="site-main"
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
