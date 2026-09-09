import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Task } from "../lib/types";
import { secondsSince } from "../lib/format";
import { colors } from "../lib/theme";

interface Props {
  task: Task;
  onClose: () => void;
  onConfirm: (durationSeconds: number) => void;
  submitting?: boolean;
}

export function CompleteTaskModal({ task, onClose, onConfirm, submitting }: Props) {
  const elapsed = task.startDate ? secondsSince(task.startDate) : 0;
  const [hours, setHours] = useState(String(Math.floor(elapsed / 3600)));
  const [minutes, setMinutes] = useState(String(Math.floor((elapsed % 3600) / 60)));
  const [seconds, setSeconds] = useState(String(elapsed % 60));

  function handleConfirm() {
    const total = Math.max(0, Number(hours) || 0) * 3600 + Math.max(0, Number(minutes) || 0) * 60 + Math.max(0, Number(seconds) || 0);
    onConfirm(total);
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Feather name="clock" size={18} color="#b45309" />
              </View>
              <Text style={styles.title}>¿Cuánto tardaste?</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>"{task.title}" — ajustá el tiempo si el cronómetro no arrancó justo a tiempo.</Text>
          <View style={styles.fieldsRow}>
            {[
              { value: hours, set: setHours, label: "hs" },
              { value: minutes, set: setMinutes, label: "min" },
              { value: seconds, set: setSeconds, label: "seg" },
            ].map((field) => (
              <View key={field.label} style={styles.field}>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.fieldLabel}>{field.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleConfirm} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Guardando..." : "Marcar como hecha"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 18, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fffbeb", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 16 },
  fieldsRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 18 },
  field: { alignItems: "center", gap: 4 },
  input: { width: 60, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.text },
  fieldLabel: { fontSize: 11, color: colors.muted },
  button: { backgroundColor: colors.green, borderRadius: 10, padding: 14 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
});
