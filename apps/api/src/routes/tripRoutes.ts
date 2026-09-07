import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { requireTripMember } from "../middleware/tripMember";
import {
  acceptInvitation,
  createTrip,
  deleteTrip,
  getTrip,
  getTripSummary,
  inviteMember,
  listTrips,
  updateTrip,
} from "../controllers/tripController";
import { createExpense, deleteExpense, listExpenses, scanReceipt } from "../controllers/expenseController";
import { completeTask, createTask, deleteTask, listTasks } from "../controllers/taskController";

const upload = multer({ dest: "uploads/" });

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

tripRoutes.get("/:tripId/expenses", requireTripMember, listExpenses);
tripRoutes.post("/:tripId/expenses", requireTripMember, createExpense);
tripRoutes.delete("/:tripId/expenses/:expenseId", requireTripMember, deleteExpense);
tripRoutes.post("/:tripId/expenses/scan-receipt", requireTripMember, upload.single("receipt"), scanReceipt);

tripRoutes.get("/:tripId/tasks", requireTripMember, listTasks);
tripRoutes.post("/:tripId/tasks", requireTripMember, createTask);
tripRoutes.post("/:tripId/tasks/:taskId/complete", requireTripMember, completeTask);
tripRoutes.delete("/:tripId/tasks/:taskId", requireTripMember, deleteTask);
