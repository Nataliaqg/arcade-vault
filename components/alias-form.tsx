"use client";

import { useActionState } from "react";
import { setUsername, type AuthState } from "@/app/auth/actions";

const INITIAL: AuthState = {};

export default function AliasForm() {
  const [state, action, pending] = useActionState(setUsername, INITIAL);

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ELIGE TU ALIAS</h2>
        </div>
        <p className="auth-check" style={{ margin: "0 0 16px" }}>
          Es el nombre que verán los demás jugadores. De 3 a 12 caracteres: letras, números o _.
        </p>
        <form action={action}>
          <div className="field">
            <label htmlFor="alias-username">Alias</label>
            <input
              id="alias-username"
              name="username"
              placeholder="px_kai"
              autoComplete="username"
              minLength={3}
              maxLength={12}
              pattern="[A-Za-z0-9_]{3,12}"
              title="De 3 a 12 caracteres: letras, números o _"
              required
            />
          </div>
          {state.error && (
            <p className="auth-error" role="alert">
              {state.error}
            </p>
          )}
          <button className="btn lg" type="submit" disabled={pending} style={{ width: "100%", marginTop: 8 }}>
            {pending ? "GUARDANDO..." : "GUARDAR ALIAS"}
          </button>
        </form>
      </div>
    </div>
  );
}
