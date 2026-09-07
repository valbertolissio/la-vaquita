import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../lib/api";
import { useTrip } from "../context/TripContext";
import { colors } from "../lib/theme";

function formatShort(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function EditTripScreen({ navigation }: any) {
  const { trip, setTrip } = useTrip();
  const [name, setName] = useState(trip?.name ?? "");
  const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate) : new Date());
  const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate) : new Date());
  const [pickerOpen, setPickerOpen] = useState<"start" | "end" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  async function handleSave() {
    if (!trip) return;
    if (!name.trim()) {
      Alert.alert("Faltan datos", "Ponele un nombre al viaje.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Fechas inválidas", "La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.updateTrip(trip.id, {
        name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setTrip(updated);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("No se pudo guardar", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Editar viaje</Text>

        <View>
          <Text style={styles.label}>Nombre del viaje</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Inicio</Text>
            <TouchableOpacity style={styles.input} onPress={() => setPickerOpen("start")}>
              <Text style={styles.dateText}>{formatShort(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fin</Text>
            <TouchableOpacity style={styles.input} onPress={() => setPickerOpen("end")}>
              <Text style={styles.dateText}>{formatShort(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {pickerOpen && (
          <DateTimePicker
            value={pickerOpen === "start" ? startDate : endDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_event, date) => {
              if (Platform.OS === "android") setPickerOpen(null);
              if (!date) return;
              if (pickerOpen === "start") setStartDate(date);
              else setEndDate(date);
            }}
          />
        )}
        {pickerOpen && Platform.OS === "ios" && (
          <TouchableOpacity style={styles.doneButton} onPress={() => setPickerOpen(null)}>
            <Text style={styles.doneText}>Listo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Guardando..." : "Guardar cambios"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "white", justifyContent: "center" },
  dateText: { fontSize: 14, color: colors.text },
  doneButton: { alignSelf: "flex-end", padding: 8 },
  doneText: { color: colors.greenDark, fontWeight: "600" },
  button: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 4 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
  cancelButton: { padding: 10 },
  cancelText: { color: colors.muted, textAlign: "center", fontSize: 13 },
});
