"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeAdminSection, adminNavItems } from "./admin-nav-state";

export function AdminNav() {
  const activeSection = activeAdminSection(usePathname());

  return (
    <nav className="grid grid-cols-2 gap-2 text-sm font-bold lg:grid-cols-1">
      {adminNavItems.map((item) => {
        const isActive = activeSection === item.section;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "rounded-lg px-3 py-2 transition",
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
