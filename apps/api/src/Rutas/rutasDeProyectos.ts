import { NextFunction, Request, Response, Router } from "express";
import multer, { MulterError } from "multer";
import { exigirSesion } from "../Intermediarios/exigirSesion";
import { exigirMiembro } from "../Intermediarios/exigirMiembro";
import {
  aceptarInvitacion,
  crearProyecto,
  eliminarProyecto,
  obtenerProyecto,
  obtenerResumenDelProyecto,
  invitarParticipante,
  listarProyectos,
  actualizarProyecto,
} from "../Controlador/ControladorProyectos";
import { crearGasto, eliminarGasto, listarGastos, escanearComprobante, actualizarGasto } from "../Controlador/ControladorGastos";
import { completarTarea, crearTarea, eliminarTarea, listarTareas, descompletarTarea, actualizarTarea } from "../Controlador/ControladorTareas";
import { crearPago, eliminarPago, listarPagos } from "../Controlador/ControladorPagos";
import { crearCategoria, eliminarCategoria, actualizarCategoria } from "../Controlador/ControladorCategorias";

// Subida del comprobante para escanear. Con límites: sin ellos, un archivo de
// varios GB o un ejecutable disfrazado de foto se guardaban igual en el disco
// del servidor antes de que nadie mirara qué eran.
const MAX_COMPROBANTE_MB = 12;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_COMPROBANTE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Las fotos del iPhone llegan como image/heic, así que alcanza con exigir
    // que sea una imagen, sin listar formato por formato.
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("El comprobante tiene que ser una imagen"));
  },
});

/**
 * Envuelve a multer para que sus errores salgan como JSON con código 400. Si se
 * dejan pasar al manejador general, el cliente recibe un 500 con HTML y en el
 * celular eso termina en un "Unexpected character: <" que no explica nada.
 */
function recibirComprobante(req: Request, res: Response, next: NextFunction) {
  upload.single("receipt")(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      const mensaje =
        err.code === "LIMIT_FILE_SIZE"
          ? `La imagen es muy grande (máximo ${MAX_COMPROBANTE_MB} MB). Sacá la foto con menos resolución.`
          : "No se pudo recibir la imagen del comprobante";
      return res.status(400).json({ error: mensaje });
    }
    if (err) return res.status(400).json({ error: (err as Error).message });
    next();
  });
}

export const rutasDeProyectos = Router();

rutasDeProyectos.use(exigirSesion);

rutasDeProyectos.get("/", listarProyectos);
rutasDeProyectos.post("/", crearProyecto);
rutasDeProyectos.post("/invitations/:token/accept", aceptarInvitacion);

rutasDeProyectos.get("/:tripId", exigirMiembro, obtenerProyecto);
rutasDeProyectos.patch("/:tripId", exigirMiembro, actualizarProyecto);
rutasDeProyectos.delete("/:tripId", exigirMiembro, eliminarProyecto);
rutasDeProyectos.get("/:tripId/summary", exigirMiembro, obtenerResumenDelProyecto);
rutasDeProyectos.post("/:tripId/invitations", exigirMiembro, invitarParticipante);

rutasDeProyectos.post("/:tripId/categories", exigirMiembro, crearCategoria);
rutasDeProyectos.patch("/:tripId/categories/:categoryId", exigirMiembro, actualizarCategoria);
rutasDeProyectos.delete("/:tripId/categories/:categoryId", exigirMiembro, eliminarCategoria);

rutasDeProyectos.get("/:tripId/expenses", exigirMiembro, listarGastos);
rutasDeProyectos.post("/:tripId/expenses", exigirMiembro, crearGasto);
rutasDeProyectos.patch("/:tripId/expenses/:expenseId", exigirMiembro, actualizarGasto);
rutasDeProyectos.delete("/:tripId/expenses/:expenseId", exigirMiembro, eliminarGasto);
rutasDeProyectos.post("/:tripId/expenses/scan-receipt", exigirMiembro, recibirComprobante, escanearComprobante);

rutasDeProyectos.get("/:tripId/tasks", exigirMiembro, listarTareas);
rutasDeProyectos.post("/:tripId/tasks", exigirMiembro, crearTarea);
rutasDeProyectos.patch("/:tripId/tasks/:taskId", exigirMiembro, actualizarTarea);
rutasDeProyectos.post("/:tripId/tasks/:taskId/complete", exigirMiembro, completarTarea);
rutasDeProyectos.post("/:tripId/tasks/:taskId/uncomplete", exigirMiembro, descompletarTarea);
rutasDeProyectos.delete("/:tripId/tasks/:taskId", exigirMiembro, eliminarTarea);

rutasDeProyectos.get("/:tripId/payments", exigirMiembro, listarPagos);
rutasDeProyectos.post("/:tripId/payments", exigirMiembro, crearPago);
rutasDeProyectos.delete("/:tripId/payments/:paymentId", exigirMiembro, eliminarPago);
