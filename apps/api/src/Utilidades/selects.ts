/**
 * Campos públicos de un usuario. Usar siempre este select (nunca `include: { user: true }`
 * o similar) al anidar un usuario dentro de otra respuesta, para no filtrar
 * passwordHash u otros campos internos al cliente.
 */
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  nickname: true,
  avatarColor: true,
} as const;
