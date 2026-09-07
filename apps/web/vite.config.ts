import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    // Este es un monorepo con la app mobile en React 19; sin esto, dependencias
    // como react-router (hoisteadas a la raíz por npm) pueden resolver esa versión
    // de React en vez de la 18.x que usa esta app, duplicando instancias de React.
    dedupe: ["react", "react-dom"],
  },
});
