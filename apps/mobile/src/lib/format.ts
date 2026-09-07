export function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export function formatDate(d: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(d));
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return "menos de 1 min";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function secondsSince(isoDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const AVATAR_COLOR_KEYS = ["green", "navy", "blue", "orange", "purple", "rose", "teal", "amber"] as const;
export type AvatarColorKey = (typeof AVATAR_COLOR_KEYS)[number];

const AVATAR_COLORS: Record<AvatarColorKey, string> = {
  green: "#2e9e5b",
  navy: "#1b1240",
  blue: "#3b82f6",
  orange: "#f97316",
  purple: "#a855f7",
  rose: "#f43f5e",
  teal: "#14b8a6",
  amber: "#f59e0b",
};

/**
 * Color de avatar por usuario, igual que en la web. Si el usuario eligió un
 * color propio (override, uno de AVATAR_COLOR_KEYS) se usa ese; si no, se
 * deriva un color estable a partir del hash de su id.
 */
export function avatarColor(userId: string, override?: string | null) {
  if (override && (AVATAR_COLOR_KEYS as readonly string[]).includes(override)) {
    return AVATAR_COLORS[override as AvatarColorKey];
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[AVATAR_COLOR_KEYS[Math.abs(hash) % AVATAR_COLOR_KEYS.length]];
}

/** Nombre a mostrar: el sobrenombre elegido por el usuario, o su nombre real. */
export function displayName(user: { name: string; nickname?: string | null }) {
  return user.nickname?.trim() ? user.nickname : user.name;
}
