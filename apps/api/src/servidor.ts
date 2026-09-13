import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { rutasDeCuentas } from "./Rutas/rutasDeCuentas";
import { rutasDeProyectos } from "./Rutas/rutasDeProyectos";

// Salvavidas: un error async sin capturar en algún controlador (una promesa
// rechazada que nadie esperó) tira abajo TODO el proceso en Node por default,
// cortando la app para todos los usuarios conectados por un solo pedido que
// falló. Loguearlo y seguir andando es mejor que un 502 general.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", rutasDeCuentas);
app.use("/api/trips", rutasDeProyectos);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Error interno del servidor" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`La Vaquita API corriendo en http://localhost:${PORT}`);
});
