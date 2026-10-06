export const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
export const PASSWORD_MIN = 8;

export function isValidUsername(v: string): boolean {
  return USERNAME_RE.test(v);
}
