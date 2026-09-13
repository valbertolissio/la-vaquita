import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../Utilidades/api";
import { useSesion } from "../Contexto/ContextoDeSesion";
import { useProyecto } from "../Contexto/ContextoDeProyecto";
import { Gasto, Pago, ResumenDelProyecto } from "../Utilidades/tipos";
import { useColoresDelTema } from "../Contexto/ContextoDeTema";
import { plata, formatearFecha, formatearDuracion, nombreVisible, resumenDePagadores } from "../Utilidades/formato";
import { useActualizacionAutomatica } from "../Utilidades/useActualizacionAutomatica";
import { Avatar } from "../Componentes/Avatar";

type Seccion = "gasto" | "pendiente" | "aportes" | "pagos" | null;

export function PantallaResumen({ navigation }: any) {
  const { colors } = useColoresDelTema();
  const { user } = useSesion();
  const { trip } = useProyecto();
  const [summary, setSummary] = useState<ResumenDelProyecto | null>(null);
  const [expenses, setExpenses] = useState<Gasto[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  const reload = useCallback(() => {
    if (!trip) return;
    api.obtenerResumen(trip.id).then(setSummary);
    api.listarGastos(trip.id).then(setExpenses);
    api.listarPagos(trip.id).then(setPayments);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  useActualizacionAutomatica(reload);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    content: { padding: 16, gap: 12 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    bigValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },
    sub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    label: { fontSize: 12, color: colors.muted },
    value: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 2 },
    splitRow: { flexDirection: "row", gap: 12, marginTop: 2 },
    splitItem: { flex: 1 },
    detalle: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
    fila: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
    filaDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    filaTitulo: { fontSize: 13, fontWeight: "600", color: colors.text },
    filaSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
    filaMonto: { fontSize: 13, fontWeight: "700", color: colors.text },
    vacio: { fontSize: 12, color: colors.muted, paddingVertical: 8 },
  });

  if (!trip) return null;

  // Cada KPI se abre y cierra por su cuenta: se pueden tener varios
  // desplegados al mismo tiempo para comparar.
  function toggle(seccion: Exclude<Seccion, null>) {
    setAbiertas((actual) => ({ ...actual, [seccion]: !actual[seccion] }));
  }

  // Cuánto puso el usuario en un gasto puntual (puede haber varios pagadores).
  function miAporte(e: Gasto) {
    return Number(e.payers.find((p) => p.userId === user?.id)?.amount ?? 0);
  }

  const pagosRecibidos = payments.filter((p) => p.toUser.id === user?.id);

  function Cabecera({ titulo, seccion }: { titulo: string; seccion: Exclude<Seccion, null> }) {
    return (
      <View style={styles.cardTop}>
        <Text style={[styles.sectionLabel, { flex: 1 }]}>{titulo}</Text>
        <Feather name={abiertas[seccion] ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resumen detallado</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {!summary ? (
        <Text style={[styles.vacio, { padding: 16 }]}>Cargando resumen...</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => toggle("gasto")}>
            <Cabecera titulo="Gasto total del proyecto" seccion="gasto" />
            <Text style={styles.bigValue}>{plata(summary.totalExpense)}</Text>
            <Text style={styles.sub}>{summary.expenseCount} gastos registrados. Tocá para ver el detalle.</Text>

            {abiertas.gasto && (
              <View style={styles.detalle}>
                {expenses.length === 0 ? (
                  <Text style={styles.vacio}>Todavía no hay gastos cargados.</Text>
                ) : (
                  expenses.map((e, i) => (
                    <View key={e.id} style={[styles.fila, i > 0 && styles.filaDivider]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filaTitulo}>{e.description}</Text>
                        <Text style={styles.filaSub}>
                          {formatearFecha(e.expenseDate)} · Pagó: {resumenDePagadores(e.payers, user?.id)}
                        </Text>
                      </View>
                      <Text style={styles.filaMonto}>{plata(e.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => toggle("pendiente")}>
            <Cabecera titulo="Pendiente de saldar" seccion="pendiente" />
            <Text style={styles.bigValue}>{plata(summary.pendingTotal)}</Text>
            <Text style={styles.sub}>Lo que falta pagar entre los participantes. Tocá para ver quién le debe a quién.</Text>

            {abiertas.pendiente && (
              <View style={styles.detalle}>
                {summary.settlements.length === 0 ? (
                  <Text style={styles.vacio}>Todos están al día. Nadie le debe nada a nadie.</Text>
                ) : (
                  summary.settlements.map((s, i) => (
                    <View key={i} style={[styles.fila, i > 0 && styles.filaDivider]}>
                      <Avatar userId={s.fromUserId} name={s.fromName} color={s.fromAvatarColor} size={22} />
                      <Feather name="arrow-right" size={12} color={colors.muted} />
                      <Avatar userId={s.toUserId} name={s.toName} color={s.toAvatarColor} size={22} />
                      <Text style={[styles.filaTitulo, { flex: 1 }]} numberOfLines={1}>
                        {s.fromName} a {s.toName}
                      </Text>
                      <Text style={styles.filaMonto}>{plata(s.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => toggle("aportes")}>
            <Cabecera titulo="Aportes a los gastos" seccion="aportes" />
            <View style={styles.splitRow}>
              <View style={styles.splitItem}>
                <Text style={styles.label}>Aportaste</Text>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                  {plata(summary.myContribution)}
                </Text>
              </View>
              <View style={styles.splitItem}>
                <Text style={styles.label}>Aportaron otros</Text>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                  {plata(summary.othersContribution)}
                </Text>
              </View>
            </View>
            <Text style={styles.sub}>Tocá para ver gasto por gasto cuánto puso cada lado.</Text>

            {abiertas.aportes && (
              <View style={styles.detalle}>
                {expenses.length === 0 ? (
                  <Text style={styles.vacio}>Todavía no hay gastos cargados.</Text>
                ) : (
                  expenses.map((e, i) => {
                    const mio = miAporte(e);
                    const otros = Number(e.amount) - mio;
                    return (
                      <View key={e.id} style={[styles.fila, i > 0 && styles.filaDivider]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.filaTitulo}>{e.description}</Text>
                          <Text style={styles.filaSub}>
                            Vos {plata(mio)} · Otros {plata(otros)}
                          </Text>
                        </View>
                        <Text style={styles.filaMonto}>{plata(e.amount)}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => toggle("pagos")}>
            <Cabecera titulo="Te pagaron" seccion="pagos" />
            <Text style={[styles.bigValue, { color: colors.greenDark }]}>{plata(summary.paidToMe)}</Text>
            <Text style={styles.sub}>Pagos que recibiste para saldar cuentas. Tocá para ver de quién.</Text>

            {abiertas.pagos && (
              <View style={styles.detalle}>
                {pagosRecibidos.length === 0 ? (
                  <Text style={styles.vacio}>Todavía no recibiste pagos.</Text>
                ) : (
                  pagosRecibidos.map((p, i) => (
                    <View key={p.id} style={[styles.fila, i > 0 && styles.filaDivider]}>
                      <Avatar userId={p.fromUser.id} name={nombreVisible(p.fromUser)} color={p.fromUser.avatarColor} size={22} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filaTitulo}>{nombreVisible(p.fromUser)}</Text>
                        <Text style={styles.filaSub}>{formatearFecha(p.createdAt)}</Text>
                      </View>
                      <Text style={[styles.filaMonto, { color: colors.greenDark }]}>{plata(p.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Detalle por participante</Text>
            {summary.balances.map((b, i) => (
              <View key={b.userId} style={[styles.fila, i > 0 && styles.filaDivider]}>
                <Avatar userId={b.userId} name={b.name} color={b.avatarColor} size={26} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.filaTitulo}>
                    {b.name}
                    {b.userId === user?.id ? " (vos)" : ""}
                  </Text>
                  <Text style={styles.filaSub}>
                    Puso {plata(b.paid)} · Le tocaba {plata(b.owed)}
                  </Text>
                </View>
                <Text style={[styles.filaMonto, { color: b.balance >= 0 ? colors.greenDark : colors.danger }]}>
                  {b.balance >= 0 ? "+" : "-"}
                  {plata(Math.abs(b.balance))}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Tiempo dedicado a tareas</Text>
            {summary.timeByParticipant.length === 0 ? (
              <Text style={styles.vacio}>Todavía no hay tareas completadas con tiempo registrado.</Text>
            ) : (
              summary.timeByParticipant.map((p, i) => (
                <View key={p.userId} style={[styles.fila, i > 0 && styles.filaDivider]}>
                  <Avatar userId={p.userId} name={p.name} color={p.avatarColor} size={26} />
                  <Text style={[styles.filaTitulo, { flex: 1 }]}>{p.name}</Text>
                  <Text style={styles.filaMonto}>{formatearDuracion(p.totalSeconds)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
