import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTrip } from "../context/TripContext";
import { TripSummary } from "../lib/types";
import { colors } from "../lib/theme";
import { money, formatDate } from "../lib/format";

export function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { trip, setTrip } = useTrip();
  const [summary, setSummary] = useState<TripSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (trip) api.getSummary(trip.id).then(setSummary);
    }, [trip])
  );

  if (!trip) return null;

  const isOrganizer = trip.members.find((m) => m.userId === user?.id)?.role === "ORGANIZER";

  function showOptions() {
    if (!trip) return;
    const options: any[] = [
      { text: "Cambiar de viaje", onPress: () => setTrip(null) },
    ];
    if (isOrganizer) {
      options.push({
        text: "Eliminar viaje",
        style: "destructive",
        onPress: () => {
          Alert.alert("Eliminar viaje", `¿Seguro que querés eliminar "${trip!.name}"? Esta acción no se puede deshacer.`, [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: async () => {
                await api.deleteTrip(trip!.id);
                setTrip(null);
              },
            },
          ]);
        },
      });
    }
    options.push({ text: "Cancelar", style: "cancel" });
    Alert.alert(trip.name, undefined, options);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerTitle}>{trip.name}</Text>
            <TouchableOpacity onPress={showOptions} hitSlop={10}>
              <Feather name="more-horizontal" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerSub}>
            {new Date(trip.startDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} -{" "}
            {new Date(trip.endDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </Text>
          <Text style={styles.bannerSub}>{trip.members.length} participantes</Text>
        </View>

        <View style={styles.quickActions}>
          {(
            [
              { icon: "dollar-sign", label: "Gastos", to: "Gastos" },
              { icon: "clipboard", label: "Tareas", to: "Tareas" },
              { icon: "users", label: "Participantes", to: "Participantes" },
              { icon: "bar-chart-2", label: "Resumen", to: "Inicio" },
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
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Tu saldo</Text>
              <Text style={[styles.balance, { color: summary.myBalance >= 0 ? colors.greenDark : colors.danger }]}>
                {summary.myBalance >= 0 ? "+ " : "- "}
                {money(Math.abs(summary.myBalance))}
              </Text>
              <Text style={styles.cardSub}>{summary.myBalance >= 0 ? "A tu favor" : "Debés"}</Text>
            </View>

            {summary.recentExpenses[0] && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Gasto reciente</Text>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{summary.recentExpenses[0].description}</Text>
                    <Text style={styles.cardSub}>Pagó: {summary.recentExpenses[0].paidBy.name}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{money(summary.recentExpenses[0].amount)}</Text>
                </View>
              </View>
            )}

            {summary.pendingTasks[0] && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Próxima tarea</Text>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{summary.pendingTasks[0].title}</Text>
                    <Text style={styles.cardSub}>Asignada a: {summary.pendingTasks[0].assignedTo?.name ?? "Sin asignar"}</Text>
                  </View>
                  {summary.pendingTasks[0].dueDate && (
                    <Text style={styles.rowAmount}>{formatDate(summary.pendingTasks[0].dueDate)}</Text>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banner: { backgroundColor: colors.navy, borderRadius: 18, padding: 18 },
  bannerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bannerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  bannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  quickActions: { flexDirection: "row", justifyContent: "space-between" },
  quickAction: { alignItems: "center", backgroundColor: "white", borderRadius: 14, padding: 12, flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: colors.border },
  quickActionIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8F5EC", alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 11, color: colors.muted, marginTop: 6 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  balance: { fontSize: 24, fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowAmount: { fontSize: 14, fontWeight: "700", color: colors.text },
});
