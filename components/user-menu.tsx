"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type { CurrentUser } from "@/lib/auth/session";

export default function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user.username) {
    return (
      <Link href="/auth/alias" className="btn yellow user-menu-cta">
        ELIGE TU ALIAS
      </Link>
    );
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-tag"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="user-tag-dot" aria-hidden="true"></span>
        <span className="user-tag-name">{user.username}</span>
        <span className="user-tag-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="user-menu-pop" id={menuId}>
          <div className="user-menu-email">{user.email}</div>
          <form action={signOut}>
            <button type="submit" className="user-menu-item">
              CERRAR SESIÓN
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
