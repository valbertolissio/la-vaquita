import { useEffect } from "react";

/**
 * Es una app colaborativa: si otro integrante carga un gasto o marca una
 * tarea, la pantalla se refresca sola (al volver a la pestaña, y cada
 * `intervalMs` mientras está abierta) para no depender de que el usuario
 * recargue a mano.
 */
export function useActualizacionAutomatica(reload: () => void, deps: unknown[], intervalMs = 15000) {
  useEffect(() => {
    function onFocus() {
      if (document.visibilityState === "visible") reload();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const interval = setInterval(reload, intervalMs);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
