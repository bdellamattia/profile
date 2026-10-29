"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "🍗" },
  { href: "/snap", label: "Snap", icon: "📸", primary: true },
  { href: "/squad", label: "Squad", icon: "🏆" },
  { href: "/me", label: "Me", icon: "😤" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-display uppercase ${
                  active ? "text-lime" : "text-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid place-items-center text-xl ${
                    t.primary ? "size-11 -mt-5 rounded-2xl bg-lime text-black shadow-[0_8px_24px_-6px_var(--lime)]" : "size-7"
                  }`}
                >
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
