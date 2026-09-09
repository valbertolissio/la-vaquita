import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { Feather } from "@expo/vector-icons";
import { Task } from "../lib/types";
import { displayName } from "../lib/format";

function formatShort(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function NewTaskScreen({ navigation, route }: any) {
  const { trip } = useTrip();
  const task: Task | undefined = route?.params?.task;
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [scheduleMode, setScheduleMode] = useState<"MANUAL" | "TIMER">(task?.timeTracked ? "TIMER" : "MANUAL");
  const [startDate, setStartDate] = useState<Date | null>(task?.startDate ? new Date(task.startDate) : null);
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ? new Date(task.dueDate) : null);
  const [showPicker, setShowPicker] = useState<"start" | "due" | null>(null);
  const [assignmentType, setAssignmentType] = useState<"MANUAL" | "ROTATING">(task?.assignmentType ?? "MANUAL");
  const [assignedToId, setAssignedToId] = useState(task?.assignedTo?.id ?? trip?.members[0]?.userId ?? "");
  const [rotationMembers, setRotationMembers] = useState<string[]>(trip?.members.map((m) => m.userId) ?? []);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  function toggleRotationMember(userId: string) {
    setRotationMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit() {
    if (!trip) return;
    if (!title.trim()) {
      Alert.alert("Falta el título", "Ponele un título a la tarea.");
      return;
    }
    if (!isEditing && assignmentType === "ROTATING" && rotationMembers.length < 2) {
      Alert.alert("Turno rotativo", "Elegí al menos 2 integrantes para el turno rotativo.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        startDate: startDate?.toISOString(),
        dueDate: scheduleMode === "MANUAL" ? dueDate?.toISOString() : undefined,
        timeTracked: scheduleMode === "TIMER",
      };
      if (isEditing) {
        await api.updateTask(trip.id, task!.id, { ...payload, assignedToId: assignmentType === "MANUAL" ? assignedToId : undefined });
      } else {
        await api.createTask(trip.id, {
          ...payload,
          assignmentType,
          assignedToId: assignmentType === "MANUAL" ? assignedToId : undefined,
          rotationMembers: assignmentType === "ROTATING" ? rotationMembers : undefined,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("No se pudo guardar", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{isEditing ? "Editar tarea" : "Tarea nueva"}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} placeholder="Cocinar cena" value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>¿Cómo querés controlar el tiempo?</Text>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, scheduleMode === "MANUAL" && styles.tabActive]} onPress={() => setScheduleMode("MANUAL")}>
              <Text style={[styles.tabText, scheduleMode === "MANUAL" && styles.tabTextActive]}>Fechas manuales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, scheduleMode === "TIMER" && styles.tabActive]} onPress={() => setScheduleMode("TIMER")}>
              <Text style={[styles.tabText, scheduleMode === "TIMER" && styles.tabTextActive]}>Cronómetro</Text>
            </TouchableOpacity>
          </View>
        </View>

        {scheduleMode === "MANUAL" ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Inicio (opcional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPicker("start")}>
                <Text style={styles.dateText}>{startDate ? formatShort(startDate) : "Elegir"}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fin</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPicker("due")}>
                <Text style={styles.dateText}>{dueDate ? formatShort(dueDate) : "Elegir"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Inicio</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPicker("start")}>
              <Text style={styles.dateText}>{startDate ? formatShort(startDate) : "Ahora"}</Text>
            </TouchableOpacity>
            <Text style={styles.helper}>Al marcarla como hecha vas a ver cuánto tiempo llevó.</Text>
          </View>
        )}

        {showPicker && (
          <DateTimePicker
            value={(showPicker === "start" ? startDate : dueDate) ?? new Date()}
            mode="datetime"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_event, date) => {
              if (Platform.OS === "android") setShowPicker(null);
              if (!date) return;
              if (showPicker === "start") setStartDate(date);
              else setDueDate(date);
            }}
          />
        )}
        {showPicker && Platform.OS === "ios" && (
          <TouchableOpacity style={styles.doneButton} onPress={() => setShowPicker(null)}>
            <Text style={styles.doneText}>Listo</Text>
          </TouchableOpacity>
        )}

        {!isEditing && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, assignmentType === "MANUAL" && styles.tabActive]}
              onPress={() => setAssignmentType("MANUAL")}
            >
              <Text style={[styles.tabText, assignmentType === "MANUAL" && styles.tabTextActive]}>Asignación manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, assignmentType === "ROTATING" && styles.tabActive]}
              onPress={() => setAssignmentType("ROTATING")}
            >
              <Text style={[styles.tabText, assignmentType === "ROTATING" && styles.tabTextActive]}>Turno rotativo</Text>
            </TouchableOpacity>
          </View>
        )}

        {assignmentType === "MANUAL" ? (
          <View>
            <Text style={styles.label}>Asignada a</Text>
            <View style={styles.chipsRow}>
              {trip.members.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={[styles.chip, assignedToId === m.userId && styles.chipActive]}
                  onPress={() => setAssignedToId(m.userId)}
                >
                  <Text style={[styles.chipText, assignedToId === m.userId && styles.chipTextActive]}>{displayName(m.user)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : !isEditing ? (
          <View>
            <Text style={styles.label}>Integrantes del turno</Text>
            <View style={styles.chipsRow}>
              {trip.members.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={[styles.chip, rotationMembers.includes(m.userId) && styles.chipActive]}
                  onPress={() => toggleRotationMember(m.userId)}
                >
                  <Text style={[styles.chipText, rotationMembers.includes(m.userId) && styles.chipTextActive]}>
                    {displayName(m.user)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.helper}>Es un turno rotativo — el orden de integrantes no se puede editar acá, solo título y fechas.</Text>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar tarea"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
  helper: { fontSize: 11, color: colors.muted, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "white", justifyContent: "center" },
  dateText: { fontSize: 14, color: colors.text },
  doneButton: { alignSelf: "flex-end", padding: 8 },
  doneText: { color: colors.greenDark, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: "#e8e6df", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.green },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: "white" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: colors.green, backgroundColor: "#e8f7ee" },
  chipText: { fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.greenDark, fontWeight: "600" },
  submitButton: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 4 },
  submitText: { color: "white", textAlign: "center", fontWeight: "700" },
});
