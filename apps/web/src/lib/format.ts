export function formatMoney(amount: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(date));
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return "menos de 1 min";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Segundos transcurridos desde una fecha ISO hasta ahora — para cronómetros en vivo. */
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

const AVATAR_COLORS: Record<AvatarColorKey, { bg: string; text: string }> = {
  green: { bg: "bg-vaquita-green", text: "text-white" },
  navy: { bg: "bg-navy-900", text: "text-white" },
  blue: { bg: "bg-blue-500", text: "text-white" },
  orange: { bg: "bg-orange-500", text: "text-white" },
  purple: { bg: "bg-purple-500", text: "text-white" },
  rose: { bg: "bg-rose-500", text: "text-white" },
  teal: { bg: "bg-teal-500", text: "text-white" },
  amber: { bg: "bg-amber-500", text: "text-white" },
};

/**
 * Color de avatar por usuario. Si el usuario eligió un color propio (override,
 * uno de AVATAR_COLOR_KEYS) se usa ese; si no, se deriva un color estable a
 * partir del hash de su id, para diferenciar participantes de un vistazo.
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
