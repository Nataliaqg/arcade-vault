"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/validation";

const INITIAL: AuthState = {};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL);

  if (state.sent) {
    return (
      <Shell title="REVISA TU CORREO">
        <div className="auth-check">
          <p>
            Si <strong>{state.email}</strong> tiene una cuenta, recibirás un enlace para elegir
            una contraseña nueva. Ábrelo en este mismo navegador.
          </p>
        </div>
        <Link href="/auth" className="btn ghost" style={{ width: "100%" }}>
          VOLVER A INICIAR SESIÓN
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="RECUPERAR ACCESO">
      <form action={action}>
        <div className="field">
          <label htmlFor="forgot-email">Correo electrónico</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            placeholder="jugador@vault.gg"
            autoComplete="email"
            defaultValue={state.email}
            required
          />
        </div>
        {state.error && (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn lg" type="submit" disabled={pending} style={{ width: "100%", marginTop: 8 }}>
          {pending ? "ENVIANDO..." : "ENVIAR ENLACE"}
        </button>
      </form>
      <Link href="/auth" className="auth-link auth-back">
        Volver a iniciar sesión
      </Link>
    </Shell>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, INITIAL);

  return (
    <Shell title="NUEVA CONTRASEÑA">
      <form action={action}>
        <div className="field">
          <label htmlFor="reset-password">Contraseña nueva</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            required
          />
        </div>
        {state.error && (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn lg" type="submit" disabled={pending} style={{ width: "100%", marginTop: 8 }}>
          {pending ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
        </button>
      </form>
    </Shell>
  );
}
