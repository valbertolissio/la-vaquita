import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../Utilidades/api";
import { useAuth } from "../Contexto/AuthContext";
import { useTrip } from "../Contexto/TripContext";
import { TripSummary } from "../Utilidades/types";
import { useThemeColors } from "../Contexto/ThemeContext";
import { money, formatDate, formatDuration, displayName, paidBySummary } from "../Utilidades/format";
import { useAutoRefresh } from "../Utilidades/useAutoRefresh";
import { Avatar } from "../Componentes/Avatar";

export function HomeScreen({ navigation }: any) {
  const { colors, mode } = useThemeColors();
  const { user } = useAuth();
  const { trip, setTrip } = useTrip();
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [markingIndex, setMarkingIndex] = useState<number | null>(null);

  const reload = useCallback(() => {
    if (trip) api.getSummary(trip.id).then(setSummary);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  useAutoRefresh(reload);

  if (!trip) return null;

  async function markSettlementPaid(index: number) {
    const s = summary?.settlements[index];
    if (!trip || !s) return;
    setMarkingIndex(index);
    try {
      await api.createPayment(trip.id, { fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount });
      reload();
    } catch (e: any) {
      Alert.alert("No se pudo registrar el pago", e.message);
    } finally {
      setMarkingIndex(null);
    }
  }

  const totalTimeSeconds = summary?.timeByParticipant.reduce((s, p) => s + p.totalSeconds, 0) ?? 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { backgroundColor: colors.navy, borderRadius: 18, padding: 18 },
    bannerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bannerBackButton: { flexDirection: "row", alignItems: "center", gap: 5 },
    bannerBackText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
    bannerTitle: { color: "white", fontSize: 18, fontWeight: "700", marginTop: 10 },
    bannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
    heroBalance: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 2, padding: 16 },
    heroBalanceIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    heroBalanceValue: { fontSize: 26, fontWeight: "800" },
    heroBalanceLink: { fontSize: 11, color: colors.muted, marginTop: 2 },
    heroBalanceBadge: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
    quickActions: { flexDirection: "row", justifyContent: "space-between" },
    quickAction: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, padding: 12, flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: colors.border },
    quickActionIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: mode === "dark" ? "rgba(46,158,91,0.15)" : "#E8F5EC", alignItems: "center", justifyContent: "center" },
    quickActionLabel: { fontSize: 11, color: colors.muted, marginTop: 6 },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    highlightCard: { borderWidth: 2 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    cardIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    cardHeaderTitle: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
    cardLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
    cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    rowAmount: { fontSize: 14, fontWeight: "700", color: colors.text },
    settlementRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 10, padding: 10 },
    settlementNames: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
    settlementText: { fontSize: 12, fontWeight: "600", color: colors.text, flexShrink: 1 },
    settlementRight: { alignItems: "flex-end", gap: 4 },
    settlementAmount: { fontSize: 13, fontWeight: "700", color: colors.text },
    paidButton: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: "rgba(46,158,91,0.4)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    paidButtonText: { fontSize: 10, fontWeight: "700", color: colors.greenDark },
    timeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 },
    resumenLink: { flexDirection: "row", alignItems: "center", gap: 10 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <TouchableOpacity style={styles.bannerBackButton} onPress={() => setTrip(null)} hitSlop={10}>
              <Feather name="grid" size={16} color="white" />
              <Text style={styles.bannerBackText}>Proyectos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Ajustes")} hitSlop={10}>
              <Feather name="settings" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerTitle}>{trip.name}</Text>
          <Text style={styles.bannerSub}>
            {new Date(trip.startDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} -{" "}
            {new Date(trip.endDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </Text>
          <Text style={styles.bannerSub}>{trip.members.length} participantes</Text>
        </View>

        {summary && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Detalle de saldo")}
            style={[
              styles.heroBalance,
              {
                backgroundColor: summary.myBalance >= 0
                  ? mode === "dark" ? "rgba(46,158,91,0.15)" : "#e8f7ee"
                  : mode === "dark" ? "rgba(239,68,68,0.14)" : "#fef2f2",
                borderColor: summary.myBalance >= 0 ? "rgba(46,158,91,0.35)" : "rgba(239,68,68,0.35)",
              },
            ]}
          >
            <View style={[styles.heroBalanceIconWrap, { backgroundColor: summary.myBalance >= 0 ? "rgba(46,158,91,0.15)" : "rgba(239,68,68,0.15)" }]}>
              <Feather name="credit-card" size={22} color={summary.myBalance >= 0 ? colors.greenDark : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Tu saldo</Text>
              <Text style={[styles.heroBalanceValue, { color: summary.myBalance >= 0 ? colors.greenDark : colors.danger }]}>
                {summary.myBalance >= 0 ? "+ " : "- "}
                {money(Math.abs(summary.myBalance))}
              </Text>
              <Text style={styles.heroBalanceLink}>Ver el detalle →</Text>
            </View>
            <Text
              style={[
                styles.heroBalanceBadge,
                { backgroundColor: summary.myBalance >= 0 ? "rgba(46,158,91,0.15)" : "rgba(239,68,68,0.15)", color: summary.myBalance >= 0 ? colors.greenDark : colors.danger },
              ]}
            >
              {summary.myBalance >= 0 ? "A tu favor" : "Debés"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.quickActions}>
          {(
            [
              { icon: "dollar-sign", label: "Gastos", to: "Gastos" },
              { icon: "clipboard", label: "Tareas", to: "Tareas" },
              { icon: "users", label: "Participantes", to: "Participantes" },
            ] as const
          ).map((a) => (
            <TouchableOpacity key={a.label} style={styles.quickAction} onPress={() => navigation.navigate(a.to)}>
              <View style={styles.quickActionIconWrap}>
                <Feather name={a.icon} size={18} color={colors.green} />
              </View>
              <Text style={styles.quickActionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {summary && (
          <>
            <TouchableOpacity style={[styles.card, styles.resumenLink]} onPress={() => navigation.navigate("Resumen")}>
              <View style={styles.cardIconWrap}>
                <Feather name="bar-chart-2" size={16} color={colors.greenDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeaderTitle}>Resumen detallado</Text>
                <Text style={styles.cardSub}>Gasto total, pendiente, aportes y pagos recibidos</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* Lo principal: saldar cuentas y tiempo dedicado a tareas */}
            <View style={[styles.card, styles.highlightCard, { borderColor: "rgba(46,158,91,0.3)" }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: mode === "dark" ? "rgba(46,158,91,0.15)" : "#e8f7ee" }]}>
                  <Feather name="repeat" size={16} color={colors.greenDark} />
                </View>
                <Text style={styles.cardHeaderTitle}>Para saldar cuentas</Text>
              </View>
              {summary.settlements.length === 0 ? (
                <Text style={styles.cardSub}>Todos están al día. Nadie le debe nada a nadie.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {summary.settlements.map((s, i) => (
                    <View key={i} style={styles.settlementRow}>
                      <View style={styles.settlementNames}>
                        <Avatar userId={s.fromUserId} name={s.fromName} color={s.fromAvatarColor} size={22} />
                        <Feather name="arrow-right" size={12} color={colors.muted} />
                        <Avatar userId={s.toUserId} name={s.toName} color={s.toAvatarColor} size={22} />
                        <Text style={styles.settlementText} numberOfLines={1}>
                          {s.fromName} → {s.toName}
                        </Text>
                      </View>
                      <View style={styles.settlementRight}>
                        <Text style={styles.settlementAmount}>{money(s.amount)}</Text>
                        {(s.fromUserId === user?.id || s.toUserId === user?.id) && (
                          <TouchableOpacity
                            onPress={() => markSettlementPaid(i)}
                            disabled={markingIndex === i}
                            style={styles.paidButton}
                          >
                            <Feather name="check" size={11} color={colors.greenDark} />
                            <Text style={styles.paidButtonText}>{markingIndex === i ? "..." : "Pagado"}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.card, styles.highlightCard, { borderColor: "rgba(217,119,6,0.3)" }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: mode === "dark" ? "rgba(245,158,11,0.14)" : "#fffbeb" }]}>
                  <Feather name="clock" size={16} color="#b45309" />
                </View>
                <Text style={styles.cardHeaderTitle}>Tiempo dedicado a tareas</Text>
              </View>
              {summary.timeByParticipant.length === 0 ? (
                <Text style={styles.cardSub}>Todavía no hay tareas completadas con tiempo registrado.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {summary.timeByParticipant.map((p) => {
                    const pct = totalTimeSeconds ? Math.round((p.totalSeconds / totalTimeSeconds) * 100) : 0;
                    return (
                      <View key={p.userId}>
                        <View style={styles.timeRow}>
                          <View style={styles.settlementNames}>
                            <Avatar userId={p.userId} name={p.name} color={p.avatarColor} size={20} />
                            <Text style={styles.rowTitle}>{p.name}</Text>
                          </View>
                          <Text style={styles.rowAmount}>{formatDuration(p.totalSeconds)}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {summary.recentExpenses[0] && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Gasto reciente</Text>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{summary.recentExpenses[0].description}</Text>
                    <Text style={styles.cardSub}>Pagó: {paidBySummary(summary.recentExpenses[0].payers)}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{money(summary.recentExpenses[0].amount)}</Text>
                </View>
              </View>
            )}

            {summary.pendingTasks[0] && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Próxima tarea</Text>
                {/* Sin fecha al lado: la tarea está pendiente, y una fecha acá
                    se leía como si ya estuviera hecha. */}
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{summary.pendingTasks[0].title}</Text>
                    <Text style={styles.cardSub}>
                      Asignada a: {summary.pendingTasks[0].assignedTo ? displayName(summary.pendingTasks[0].assignedTo) : "Sin asignar"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
