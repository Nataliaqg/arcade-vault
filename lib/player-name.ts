const KEY = "arcade-vault:player-name:v1";

export const PLAYER_NAME_MIN = 3;
export const PLAYER_NAME_MAX = 12;

export const isValidPlayerName = (name: string) => {
  const n = name.trim();
  return n.length >= PLAYER_NAME_MIN && n.length <= PLAYER_NAME_MAX;
};

// Solo navegador. localStorage puede estar bloqueado o lanzar: nunca debe romper el modal.
export function readStoredName(): string {
  try {
    const value = window.localStorage.getItem(KEY)?.trim() ?? "";
    return isValidPlayerName(value) ? value : "";
  } catch {
    return "";
  }
}

export function storeName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name.trim());
  } catch {
    // Sin persistencia: el modal sigue funcionando con el campo vacío.
  }
}
