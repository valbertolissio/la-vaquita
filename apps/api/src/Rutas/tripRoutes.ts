import { NextFunction, Request, Response, Router } from "express";
import multer, { MulterError } from "multer";
import { requireAuth } from "../Intermediarios/auth";
import { requireTripMember } from "../Intermediarios/tripMember";
import {
  acceptInvitation,
  createTrip,
  deleteTrip,
  getTrip,
  getTripSummary,
  inviteMember,
  listTrips,
  updateTrip,
} from "../Controlador/tripController";
import { createExpense, deleteExpense, listExpenses, scanReceipt, updateExpense } from "../Controlador/expenseController";
import { completeTask, createTask, deleteTask, listTasks, uncompleteTask, updateTask } from "../Controlador/taskController";
import { createPayment, deletePayment, listPayments } from "../Controlador/paymentController";
import { createCategory, deleteCategory, updateCategory } from "../Controlador/categoryController";

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

export const tripRoutes = Router();

tripRoutes.use(requireAuth);

tripRoutes.get("/", listTrips);
tripRoutes.post("/", createTrip);
tripRoutes.post("/invitations/:token/accept", acceptInvitation);

tripRoutes.get("/:tripId", requireTripMember, getTrip);
tripRoutes.patch("/:tripId", requireTripMember, updateTrip);
tripRoutes.delete("/:tripId", requireTripMember, deleteTrip);
tripRoutes.get("/:tripId/summary", requireTripMember, getTripSummary);
tripRoutes.post("/:tripId/invitations", requireTripMember, inviteMember);

tripRoutes.post("/:tripId/categories", requireTripMember, createCategory);
tripRoutes.patch("/:tripId/categories/:categoryId", requireTripMember, updateCategory);
tripRoutes.delete("/:tripId/categories/:categoryId", requireTripMember, deleteCategory);

tripRoutes.get("/:tripId/expenses", requireTripMember, listExpenses);
tripRoutes.post("/:tripId/expenses", requireTripMember, createExpense);
tripRoutes.patch("/:tripId/expenses/:expenseId", requireTripMember, updateExpense);
tripRoutes.delete("/:tripId/expenses/:expenseId", requireTripMember, deleteExpense);
tripRoutes.post("/:tripId/expenses/scan-receipt", requireTripMember, recibirComprobante, scanReceipt);

tripRoutes.get("/:tripId/tasks", requireTripMember, listTasks);
tripRoutes.post("/:tripId/tasks", requireTripMember, createTask);
tripRoutes.patch("/:tripId/tasks/:taskId", requireTripMember, updateTask);
tripRoutes.post("/:tripId/tasks/:taskId/complete", requireTripMember, completeTask);
tripRoutes.post("/:tripId/tasks/:taskId/uncomplete", requireTripMember, uncompleteTask);
tripRoutes.delete("/:tripId/tasks/:taskId", requireTripMember, deleteTask);

tripRoutes.get("/:tripId/payments", requireTripMember, listPayments);
tripRoutes.post("/:tripId/payments", requireTripMember, createPayment);
tripRoutes.delete("/:tripId/payments/:paymentId", requireTripMember, deletePayment);
