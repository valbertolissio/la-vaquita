import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface DatosDelToken {
  userId: string;
}

export function firmarToken(payload: DatosDelToken): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verificarToken(token: string): DatosDelToken {
  return jwt.verify(token, JWT_SECRET) as DatosDelToken;
}
