"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import UserMenu from "@/components/user-menu";
import type { CurrentUser } from "@/lib/auth/session";

export default function Nav({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  type NavName = "inicio" | "biblioteca" | "salon" | "auth";

  const isActive = (name: NavName) => {
    if (name === "inicio") return pathname === "/";
    if (name === "biblioteca")
      return pathname === "/games" || pathname.startsWith("/games/");
    return pathname === `/${name}`;
  };
  const cls = (name: NavName) =>
    isActive(name) ? "active" : undefined;
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("inicio")}>
            Inicio
          </Link>
          <Link href="/games" className={cls("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={cls("inicio")} onClick={close}>
          Inicio
        </Link>
        <Link href="/games" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        {!user ? (
          <Link href="/auth" className={cls("auth")} onClick={close}>
            Iniciar Sesión
          </Link>
        ) : user.username ? (
          <>
            <div className="mobile-user">
              <span className="user-tag-dot" aria-hidden="true"></span>
              {user.username}
            </div>
            <form action={signOut}>
              <button type="submit" className="mobile-signout">
                CERRAR SESIÓN
              </button>
            </form>
          </>
        ) : (
          <Link href="/auth/alias" onClick={close}>
            ELIGE TU ALIAS
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
