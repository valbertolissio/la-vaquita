const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getToken() {
  return localStorage.getItem("la-vaquita-token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Ocurrió un error inesperado");
  }
  if (res.status === 204) return undefined as T;
  try {
    return await res.json();
  } catch {
    throw new Error("No pudimos conectar con el servidor. Probá de nuevo en unos segundos.");
  }
}

export const api = {
  registrar: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  iniciarSesion: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  olvideMiContrasena: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  restablecerContrasena: (data: { token: string; password: string }) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
  miPerfil: () => request<any>("/auth/me"),
  actualizarMiPerfil: (data: { name?: string; nickname?: string | null; avatarColor?: string | null }) =>
    request<any>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  listarProyectos: () => request<any[]>("/trips"),
  crearProyecto: (data: any) => request<any>("/trips", { method: "POST", body: JSON.stringify(data) }),
  obtenerProyecto: (tripId: string) => request<any>(`/trips/${tripId}`),
  actualizarProyecto: (tripId: string, data: any) =>
    request<any>(`/trips/${tripId}`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarProyecto: (tripId: string) => request<void>(`/trips/${tripId}`, { method: "DELETE" }),
  crearCategoria: (tripId: string, data: { name: string; icon?: string; color?: string }) =>
    request<any>(`/trips/${tripId}/categories`, { method: "POST", body: JSON.stringify(data) }),
  actualizarCategoria: (tripId: string, categoryId: string, data: { name?: string; icon?: string | null; color?: string | null }) =>
    request<any>(`/trips/${tripId}/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarCategoria: (tripId: string, categoryId: string) =>
    request<void>(`/trips/${tripId}/categories/${categoryId}`, { method: "DELETE" }),
  obtenerResumen: (tripId: string) => request<any>(`/trips/${tripId}/summary`),
  invitarParticipante: (tripId: string, email?: string) =>
    request<{ id: string; email: string | null; token: string; emailSent: boolean }>(`/trips/${tripId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  aceptarInvitacion: (token: string) =>
    request<{ tripId: string }>(`/trips/invitations/${token}/accept`, { method: "POST" }),

  listarGastos: (tripId: string) => request<any[]>(`/trips/${tripId}/expenses`),
  crearGasto: (tripId: string, data: any) =>
    request(`/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(data) }),
  actualizarGasto: (tripId: string, expenseId: string, data: any) =>
    request(`/trips/${tripId}/expenses/${expenseId}`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarGasto: (tripId: string, expenseId: string) =>
    request(`/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" }),
  escanearComprobante: (tripId: string, file: File) => {
    const form = new FormData();
    form.append("receipt", file);
    return request<{
      description: string;
      amount: number | null;
      merchant: string | null;
      expenseDate: string;
      receiptUrl: string;
      confidence: number;
      items: { description: string; amount: number; cantidad: number }[];
      /** true solo si `amount` salió de una línea "TOTAL" del ticket. */
      totalConfiable: boolean;
    }>(`/trips/${tripId}/expenses/scan-receipt`, { method: "POST", body: form });
  },

  listarTareas: (tripId: string) => request<any[]>(`/trips/${tripId}/tasks`),
  crearTarea: (tripId: string, data: any) =>
    request(`/trips/${tripId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  actualizarTarea: (tripId: string, taskId: string, data: any) =>
    request(`/trips/${tripId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  completarTarea: (tripId: string, taskId: string, data?: { durationSeconds?: number }) =>
    request<{ task: any; durationSeconds: number | null; rotated: boolean; nextAssignee: { id: string; name: string } | null }>(
      `/trips/${tripId}/tasks/${taskId}/complete`,
      { method: "POST", body: JSON.stringify(data ?? {}) }
    ),
  descompletarTarea: (tripId: string, taskId: string) =>
    request<any>(`/trips/${tripId}/tasks/${taskId}/uncomplete`, { method: "POST" }),
  eliminarTarea: (tripId: string, taskId: string) =>
    request(`/trips/${tripId}/tasks/${taskId}`, { method: "DELETE" }),

  listarPagos: (tripId: string) => request<any[]>(`/trips/${tripId}/payments`),
  crearPago: (tripId: string, data: { fromUserId: string; toUserId: string; amount: number; note?: string }) =>
    request<any>(`/trips/${tripId}/payments`, { method: "POST", body: JSON.stringify(data) }),
  eliminarPago: (tripId: string, paymentId: string) =>
    request(`/trips/${tripId}/payments/${paymentId}`, { method: "DELETE" }),
};

export function guardarToken(token: string) {
  localStorage.setItem("la-vaquita-token", token);
}

export function borrarToken() {
  localStorage.removeItem("la-vaquita-token");
}
