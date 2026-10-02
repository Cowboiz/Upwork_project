"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { AccountMenuItem } from "@/lib/auth/account-menu";

type AccountMenuProps = {
  displayName: string;
  email: string | null;
  items: AccountMenuItem[];
  roleLabel: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
};

export function AccountMenu({
  displayName,
  email,
  items,
  roleLabel,
  signOutAction,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-2 py-1 text-left shadow-sm hover:border-blue-200"
        id={buttonId}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-40 sm:block">
          <span className="block truncate text-sm font-bold text-slate-950">
            {displayName}
          </span>
          <span className="block truncate text-xs font-bold uppercase text-slate-500">
            {roleLabel}
          </span>
        </span>
      </button>

      {open ? (
        <div
          aria-labelledby={buttonId}
          className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          id={menuId}
          role="menu"
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-950">
              {displayName}
            </p>
            {email ? (
              <p className="mt-1 truncate text-sm text-slate-600">{email}</p>
            ) : null}
          </div>

          <div className="grid p-2 text-sm font-bold text-slate-700">
            {items.map((item) => (
              <Link
                className="rounded-md px-3 py-2 hover:bg-slate-100"
                href={item.href}
                key={item.href}
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <form action={signOutAction} className="border-t border-slate-200 p-2">
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
              role="menuitem"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
