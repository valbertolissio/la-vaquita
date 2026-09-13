import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Es una app colaborativa: si otro integrante carga un gasto o marca una
 * tarea, la pantalla se refresca sola cada `intervalMs` mientras está en
 * foco, para no depender de que el usuario la cierre y reabra a mano.
 */
export function useAutoRefresh(reload: () => void, intervalMs = 15000) {
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(reload, intervalMs);
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, intervalMs])
  );
}
