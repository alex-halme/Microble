"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Daily" },
  { href: "/play", label: "Free Play" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      style={{
        display: "inline-flex",
        gap: "3px",
        padding: "3px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.86)",
        border: "1px solid var(--border)",
      }}
    >
      {ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "7px 14px",
              borderRadius: "999px",
              color: isActive ? "var(--fg)" : "var(--fg-2)",
              background: isActive ? "var(--surface-tint)" : "transparent",
              border: isActive ? "1px solid var(--accent-border)" : "1px solid transparent",
              boxShadow: isActive ? "0 1px 2px rgba(15, 23, 42, 0.06)" : "none",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
