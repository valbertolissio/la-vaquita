import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { Task } from "../lib/types";
import { colors } from "../lib/theme";
import { formatDate } from "../lib/format";

export function TasksScreen({ navigation }: any) {
  const { trip } = useTrip();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  const reload = useCallback(() => {
    if (trip) api.listTasks(trip.id).then(setTasks);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!trip) return null;

  async function toggleDone(task: Task) {
    if (task.status === "DONE" || !trip) return;
    await api.completeTask(trip.id, task.id);
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
      <FlatList
        data={tasks ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          tasks === null ? <Text style={styles.empty}>Cargando tareas...</Text> : <Text style={styles.empty}>Todavía no hay tareas.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => toggleDone(item)} onLongPress={() => confirmDelete(item)}>
            <View style={[styles.checkbox, item.status === "DONE" && styles.checkboxDone]}>
              {item.status === "DONE" && <Feather name="check" size={13} color="white" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, item.status === "DONE" && styles.done]}>{item.title}</Text>
              <View style={styles.subRow}>
                <Text style={styles.cardSub}>Asignada a: {item.assignedTo?.name ?? "Sin asignar"}</Text>
                {item.assignmentType === "ROTATING" && (
                  <View style={styles.badge}>
                    <Feather name="repeat" size={9} color={colors.greenDark} />
                    <Text style={styles.badgeText}> Turno rotativo</Text>
                  </View>
                )}
              </View>
            </View>
            {item.dueDate && <Text style={styles.dueDate}>{formatDate(item.dueDate)}</Text>}
          </TouchableOpacity>
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
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.green, borderColor: colors.green },
  cardTitle: { fontWeight: "600", color: colors.text },
  done: { textDecorationLine: "line-through", color: colors.muted },
  subRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 3 },
  cardSub: { fontSize: 12, color: colors.muted },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#e8f7ee", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: colors.greenDark, fontWeight: "600" },
  dueDate: { fontSize: 12, color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
