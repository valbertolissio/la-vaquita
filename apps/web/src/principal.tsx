import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Aplicacion from "./Aplicacion";
import { ProveedorDeSesion } from "./Contexto/ContextoDeSesion";
import { ProveedorDeTema } from "./Contexto/ContextoDeTema";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorDeTema>
        <ProveedorDeSesion>
          <Aplicacion />
        </ProveedorDeSesion>
      </ProveedorDeTema>
    </BrowserRouter>
  </React.StrictMode>
);
