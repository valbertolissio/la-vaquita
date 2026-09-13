import { Router } from "express";
import { actualizarMiPerfil, iniciarSesion, miPerfil, olvideMiContrasena, registrarUsuario, restablecerContrasena } from "../Controlador/ControladorCuentas";
import { exigirSesion } from "../Intermediarios/exigirSesion";

export const rutasDeCuentas = Router();

rutasDeCuentas.post("/register", registrarUsuario);
rutasDeCuentas.post("/login", iniciarSesion);
rutasDeCuentas.post("/forgot-password", olvideMiContrasena);
rutasDeCuentas.post("/reset-password", restablecerContrasena);
rutasDeCuentas.get("/me", exigirSesion, miPerfil);
rutasDeCuentas.patch("/me", exigirSesion, actualizarMiPerfil);
