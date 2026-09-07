import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { Task } from "../lib/types";
import { colors } from "../lib/theme";
import { formatDate, formatDuration, displayName } from "../lib/format";
import { LiveTimer } from "../components/LiveTimer";

export function TasksScreen({ navigation }: any) {
  const { trip } = useTrip();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (trip) api.listTasks(trip.id).then(setTasks);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  if (!trip) return null;

  async function toggleDone(task: Task) {
    if (task.status === "DONE" || !trip) return;
    const result = await api.completeTask(trip.id, task.id);
    const durationText = result.durationSeconds != null ? ` (te llevó ${formatDuration(result.durationSeconds)})` : "";
    if (result.rotated && result.nextAssignee) {
      setToast(`¡Listo${durationText}! Ahora le toca a ${result.nextAssignee.name}.`);
    } else {
      setToast(`¡Tarea completada${durationText}!`);
    }
    reload();
  }

  function confirmDelete(task: Task) {
    Alert.alert("Eliminar tarea", `¿Eliminar "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await api.deleteTask(trip!.id, task.id);
          reload();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tareas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("Tarea nueva")}>
          <Feather name="plus" size={13} color="white" />
          <Text style={styles.addButtonText}> Tarea</Text>
        </TouchableOpacity>
      </View>

      {tasks && tasks.length > 0 && <Text style={styles.hint}>Tocá una tarea para editarla, o el ícono de tacho para eliminarla.</Text>}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <FlatList
        data={tasks ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          tasks === null ? <Text style={styles.empty}>Cargando tareas...</Text> : <Text style={styles.empty}>Todavía no hay tareas.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => toggleDone(item)} hitSlop={8}>
              <View style={[styles.checkbox, item.status === "DONE" && styles.checkboxDone]}>
                {item.status === "DONE" && <Feather name="check" size={13} color="white" />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("Tarea nueva", { task: item })}
              onLongPress={() => confirmDelete(item)}
            >
              <Text style={[styles.cardTitle, item.status === "DONE" && styles.done]}>{item.title}</Text>
              <View style={styles.subRow}>
                <Text style={styles.cardSub}>Asignada a: {item.assignedTo ? displayName(item.assignedTo) : "Sin asignar"}</Text>
                {item.assignmentType === "ROTATING" && (
                  <View style={styles.badge}>
                    <Feather name="repeat" size={9} color={colors.greenDark} />
                    <Text style={styles.badgeText}> Turno rotativo</Text>
                  </View>
                )}
                {item.timeTracked && item.startDate && item.status === "PENDING" && (
                  <View style={styles.timerBadge}>
                    <Feather name="clock" size={9} color="#b45309" />
                    <LiveTimer startDate={item.startDate} style={styles.timerText} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {item.dueDate && <Text style={styles.dueDate}>{formatDate(item.dueDate)}</Text>}
            <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.deleteButton}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "white", fontWeight: "600", fontSize: 12 },
  hint: { fontSize: 11, color: colors.muted, paddingHorizontal: 16, marginBottom: 4 },
  toast: { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#e8f7ee", borderRadius: 10, padding: 12 },
  toastText: { color: colors.greenDark, fontWeight: "600", fontSize: 13 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.green, borderColor: colors.green },
  cardTitle: { fontWeight: "600", color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.muted },
  subRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 3 },
  cardSub: { fontSize: 12, color: colors.muted },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#e8f7ee", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: colors.greenDark, fontWeight: "600" },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fffbeb", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  timerText: { fontSize: 10, color: "#b45309", fontWeight: "600" },
  dueDate: { fontSize: 12, color: colors.muted },
  deleteButton: { padding: 4 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
