export const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
export const PASSWORD_MIN = 8;

// Mismo conjunto de símbolos que acepta Supabase: !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";
export const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]).{8,}$/;
export const PASSWORD_HINT = "Mín. 8 caracteres con mayúscula, minúscula, número y símbolo";

export function isValidUsername(v: string): boolean {
  return USERNAME_RE.test(v);
}

export function isValidPassword(v: string): boolean {
  return PASSWORD_RE.test(v);
}

/** Requisitos que faltan, en español, para el mensaje de error. */
export function missingPasswordRules(v: string): string[] {
  const missing: string[] = [];
  if (v.length < PASSWORD_MIN) missing.push(`${PASSWORD_MIN} caracteres`);
  if (!/[a-z]/.test(v)) missing.push("una minúscula");
  if (!/[A-Z]/.test(v)) missing.push("una mayúscula");
  if (!/\d/.test(v)) missing.push("un número");
  if (![...v].some((c) => PASSWORD_SYMBOLS.includes(c))) missing.push("un símbolo");
  return missing;
}

/** Mensaje de error para una contraseña que no cumple, o null si es válida. */
export function passwordErrorMessage(v: string): string | null {
  if (isValidPassword(v)) return null;
  return `La contraseña debe incluir: ${missingPasswordRules(v).join(", ")}`;
}
