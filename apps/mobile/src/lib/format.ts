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

const AVATAR_COLORS = ["#2e9e5b", "#1b1240", "#3b82f6", "#f97316", "#a855f7", "#f43f5e", "#14b8a6", "#f59e0b"];

/** Color de avatar estable por usuario, igual que en la web, para diferenciar participantes de un vistazo. */
export function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
