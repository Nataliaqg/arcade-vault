"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  resendConfirmation,
  signIn,
  signInWithProvider,
  signUp,
  type AuthState,
} from "@/app/auth/actions";
import { PASSWORD_HINT, passwordErrorMessage } from "@/lib/auth/validation";

const INITIAL: AuthState = {};

function ResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, INITIAL);
  return (
    <form action={action} className="auth-resend">
      <input type="hidden" name="email" value={email} />
      <button className="btn ghost" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "ENVIANDO..." : "REENVIAR CORREO"}
      </button>
      {state.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      {!state.error && state.sent && state.email && (
        <p className="auth-notice" role="status">
          Correo reenviado. Revisa también la carpeta de spam.
        </p>
      )}
    </form>
  );
}

function CheckMail({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="auth-check">
      <h3 className="neon-yellow">REVISA TU CORREO</h3>
      <p>
        Hemos enviado un enlace de confirmación a <strong>{email}</strong>. Ábrelo en este
        mismo navegador para activar tu cuenta.
      </p>
      <ResendForm email={email} />
      <button type="button" className="auth-link" onClick={onBack}>
        Usar otro correo
      </button>
    </div>
  );
}

export default function AuthForm({
  linkError = false,
  oauthError = false,
}: {
  linkError?: boolean;
  oauthError?: boolean;
}) {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState(signIn, INITIAL);
  const [upState, upAction, upPending] = useActionState(signUp, INITIAL);
  const [dismissedMail, setDismissedMail] = useState<AuthState | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const showCheckMail = tab === "up" && upState.sent && upState !== dismissedMail;
  const state = tab === "in" ? inState : upState;
  const pending = tab === "in" ? inPending : upPending;

  function changeTab(next: "in" | "up") {
    setTab(next);
    setPasswordError(null);
  }

  // Evita mandar a Supabase una contraseña que sabemos que no pasará la regex.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (tab !== "up") return;
    const password = new FormData(e.currentTarget).get("password");
    const error = passwordErrorMessage(typeof password === "string" ? password : "");
    if (error) {
      e.preventDefault();
      setPasswordError(error);
    }
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        {linkError && (
          <p className="auth-error" role="alert">
            El enlace no es válido o ha caducado. Ábrelo en el mismo navegador donde lo
            pediste, o solicita uno nuevo.
          </p>
        )}

        {oauthError && (
          <p className="auth-error" role="alert">
            No se pudo iniciar sesión con Google o GitHub. Inténtalo de nuevo o usa tu correo.
          </p>
        )}

        {showCheckMail ? (
          <CheckMail email={upState.email ?? ""} onBack={() => setDismissedMail(upState)} />
        ) : (
          <>
            <div className="auth-tabs">
              <button type="button" className={tab === "in" ? "on" : ""} onClick={() => changeTab("in")}>
                INICIAR SESIÓN
              </button>
              <button type="button" className={tab === "up" ? "on" : ""} onClick={() => changeTab("up")}>
                CREAR CUENTA
              </button>
            </div>

            <form action={tab === "in" ? inAction : upAction} onSubmit={onSubmit} key={tab}>
              {tab === "up" && (
                <div className="field">
                  <label htmlFor="auth-username">Alias</label>
                  <input
                    id="auth-username"
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
              )}
              <div className="field">
                <label htmlFor="auth-email">Correo electrónico</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="jugador@vault.gg"
                  autoComplete="email"
                  defaultValue={state.email}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="auth-password">Contraseña</label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={tab === "in" ? "current-password" : "new-password"}
                  aria-describedby={tab === "up" ? "auth-password-hint" : undefined}
                  onChange={() => passwordError && setPasswordError(null)}
                  required
                />
                {tab === "up" && (
                  <p id="auth-password-hint" className="field-hint">
                    {PASSWORD_HINT}
                  </p>
                )}
              </div>

              {(passwordError ?? state.error) && (
                <p className="auth-error" role="alert">
                  {passwordError ?? state.error}
                </p>
              )}
              {tab === "in" && inState.unconfirmed && inState.email && (
                <ResendForm email={inState.email} />
              )}
              {tab === "in" && (
                <Link href="/auth/forgot" className="auth-link auth-forgot">
                  ¿OLVIDASTE TU CONTRASEÑA?
                </Link>
              )}

              <button
                className="btn lg"
                type="submit"
                disabled={pending}
                style={{ width: "100%", marginTop: 8 }}
              >
                {pending
                  ? tab === "in"
                    ? "ENTRANDO..."
                    : "CREANDO CUENTA..."
                  : tab === "in"
                    ? "ENTRAR AL VAULT"
                    : "CREAR CUENTA"}
              </button>
            </form>
          </>
        )}

        <Link href="/games" className="btn ghost" style={{ width: "100%", marginTop: 10 }}>
          JUGAR COMO INVITADO
        </Link>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <form action={signInWithProvider.bind(null, "google")}>
            <button className="btn ghost" type="submit" style={{ width: "100%" }}>
              ◆&nbsp; GOOGLE
            </button>
          </form>
          <form action={signInWithProvider.bind(null, "github")}>
            <button className="btn ghost" type="submit" style={{ width: "100%" }}>
              ▣&nbsp; GITHUB
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
