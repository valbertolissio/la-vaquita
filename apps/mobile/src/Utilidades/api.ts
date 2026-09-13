import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";

// Un celular físico (Expo Go) no puede usar "localhost": eso apuntaría al propio
// teléfono. Expo Go conoce la IP de la compu porque es la misma que usa para
// servir el bundle (hostUri, ej. "192.168.0.61:8081") — la reusamos así no hay
// que hardcodear ni actualizar la IP a mano cada vez que cambia la red wifi.
// Esto se rompe en modo túnel (`expo start --tunnel`): ahí el bundler vive en
// un dominio de túnel que NO sirve la API. Para ese caso se puede fijar
// EXPO_PUBLIC_API_URL (ej. en un .env) apuntando a un túnel propio de la API.
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;
  return "http://localhost:4000"; // fallback: simulador/emulador corriendo en la misma máquina
}

export const API_URL = resolveApiUrl();
const TOKEN_KEY = "la-vaquita-token";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
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

/**
 * Sube un archivo local a la API. No usa fetch+FormData: el fetch nuevo de
 * Expo no soporta el formato clásico de RN ({ uri, name, type }) para
 * adjuntar archivos, así que se usa el uploader nativo de expo-file-system,
 * que maneja el multipart por afuera de esa capa.
 */
async function uploadFile<T>(path: string, fileUri: string, fieldName: string): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const result = await FileSystem.uploadAsync(`${API_URL}/api${path}`, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType: "image/jpeg",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  // El servidor (o el túnel de desarrollo) puede responder con una página HTML
  // de error si se reinició o se cayó en medio de la subida. Sin este control,
  // el JSON.parse falla con un mensaje incomprensible para el usuario
  // ("JSON Parse error: Unexpected character: <").
  let body: any = {};
  try {
    body = JSON.parse(result.body || "{}");
  } catch {
    throw new Error("No pudimos conectar con el servidor. Probá de nuevo en unos segundos.");
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(body.error ?? "Ocurrió un error inesperado");
  }
  return body;
}

export const api = {
  registrar: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  iniciarSesion: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  olvideMiContrasena: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
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
  escanearComprobante: (tripId: string, fileUri: string) =>
    uploadFile<{
      description: string;
      amount: number | null;
      merchant: string | null;
      expenseDate: string;
      receiptUrl: string;
      confidence: number;
      items: { description: string; amount: number; cantidad: number }[];
      /** true solo si `amount` salió de una línea "TOTAL" del ticket. */
      totalConfiable: boolean;
    }>(`/trips/${tripId}/expenses/scan-receipt`, fileUri, "receipt"),

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

export async function guardarToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function borrarToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
