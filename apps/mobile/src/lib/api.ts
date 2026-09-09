import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

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
  return res.json();
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<any>("/auth/me"),
  updateMe: (data: { name?: string; nickname?: string | null; avatarColor?: string | null }) =>
    request<any>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  listTrips: () => request<any[]>("/trips"),
  createTrip: (data: any) => request<any>("/trips", { method: "POST", body: JSON.stringify(data) }),
  getTrip: (tripId: string) => request<any>(`/trips/${tripId}`),
  updateTrip: (tripId: string, data: any) =>
    request<any>(`/trips/${tripId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTrip: (tripId: string) => request<void>(`/trips/${tripId}`, { method: "DELETE" }),
  getSummary: (tripId: string) => request<any>(`/trips/${tripId}/summary`),
  inviteMember: (tripId: string, email?: string) =>
    request<{ id: string; email: string | null; token: string; emailSent: boolean }>(`/trips/${tripId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  acceptInvitation: (token: string) =>
    request<{ tripId: string }>(`/trips/invitations/${token}/accept`, { method: "POST" }),

  listExpenses: (tripId: string) => request<any[]>(`/trips/${tripId}/expenses`),
  createExpense: (tripId: string, data: any) =>
    request(`/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (tripId: string, expenseId: string, data: any) =>
    request(`/trips/${tripId}/expenses/${expenseId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteExpense: (tripId: string, expenseId: string) =>
    request(`/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" }),
  scanReceipt: (tripId: string, fileUri: string) => {
    const form = new FormData();
    form.append("receipt", { uri: fileUri, name: "receipt.jpg", type: "image/jpeg" } as any);
    return request<{ description: string; amount: number | null; merchant: string | null; expenseDate: string; receiptUrl: string; confidence: number }>(
      `/trips/${tripId}/expenses/scan-receipt`,
      { method: "POST", body: form }
    );
  },

  listTasks: (tripId: string) => request<any[]>(`/trips/${tripId}/tasks`),
  createTask: (tripId: string, data: any) =>
    request(`/trips/${tripId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  updateTask: (tripId: string, taskId: string, data: any) =>
    request(`/trips/${tripId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  completeTask: (tripId: string, taskId: string, data?: { durationSeconds?: number }) =>
    request<{ task: any; durationSeconds: number | null; rotated: boolean; nextAssignee: { id: string; name: string } | null }>(
      `/trips/${tripId}/tasks/${taskId}/complete`,
      { method: "POST", body: JSON.stringify(data ?? {}) }
    ),
  uncompleteTask: (tripId: string, taskId: string) =>
    request<any>(`/trips/${tripId}/tasks/${taskId}/uncomplete`, { method: "POST" }),
  deleteTask: (tripId: string, taskId: string) =>
    request(`/trips/${tripId}/tasks/${taskId}`, { method: "DELETE" }),

  listPayments: (tripId: string) => request<any[]>(`/trips/${tripId}/payments`),
  createPayment: (tripId: string, data: { fromUserId: string; toUserId: string; amount: number; note?: string }) =>
    request<any>(`/trips/${tripId}/payments`, { method: "POST", body: JSON.stringify(data) }),
  deletePayment: (tripId: string, paymentId: string) =>
    request(`/trips/${tripId}/payments/${paymentId}`, { method: "DELETE" }),
};

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
