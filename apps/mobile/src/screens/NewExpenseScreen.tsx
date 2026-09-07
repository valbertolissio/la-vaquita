import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { Expense } from "../lib/types";
import { displayName } from "../lib/format";

export function NewExpenseScreen({ navigation, route }: any) {
  const { trip } = useTrip();
  const expense: Expense | undefined = route?.params?.expense;
  const isEditing = !!expense;

  const [tab, setTab] = useState<"manual" | "ocr">("manual");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [paidById, setPaidById] = useState(expense?.paidBy.id ?? trip?.members[0]?.userId ?? "");
  const [splitBetween, setSplitBetween] = useState<string[]>(
    expense ? expense.splits.map((s) => s.userId) : trip?.members.map((m) => m.userId) ?? []
  );
  const [notes, setNotes] = useState("");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  function toggleMember(userId: string) {
    setSplitBetween((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function pickReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a la cámara para escanear el ticket.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
      setTab("manual"); // El OCR pre-completaría estos campos; por ahora pasa a carga manual para confirmar.
    }
  }

  async function handleSubmit() {
    if (!trip) return;
    if (!description || !amount || Number(amount) <= 0 || splitBetween.length === 0) {
      Alert.alert("Faltan datos", "Completá descripción, monto y entre quiénes se divide.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        description,
        amount: Number(amount),
        paidById,
        splitBetween,
        notes: notes || undefined,
      };
      if (isEditing) {
        await api.updateExpense(trip.id, expense!.id, payload);
      } else {
        await api.createExpense(trip.id, payload);
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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.title}>{isEditing ? "Editar gasto" : "Gasto nuevo"}</Text>

        {!isEditing && (
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, tab === "manual" && styles.tabActive]} onPress={() => setTab("manual")}>
              <Text style={[styles.tabText, tab === "manual" && styles.tabTextActive]}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === "ocr" && styles.tabActive]} onPress={() => setTab("ocr")}>
              <Text style={[styles.tabText, tab === "ocr" && styles.tabTextActive]}>Con comprobante (OCR)</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "ocr" ? (
          <TouchableOpacity style={styles.dropzone} onPress={pickReceipt}>
            <Feather name="camera" size={28} color={colors.muted} />
            <Text style={styles.dropzoneTitle}>Sacá una foto del ticket</Text>
            <Text style={styles.cardSub}>o elegí de tu galería</Text>
          </TouchableOpacity>
        ) : (
          <>
            {receiptUri && (
              <View style={styles.receiptOk}>
                <Feather name="check-circle" size={14} color={colors.greenDark} />
                <Text style={styles.cardSub}>Comprobante adjuntado</Text>
              </View>
            )}

            <View>
              <Text style={styles.label}>¿Qué fue?</Text>
              <TextInput style={styles.input} placeholder="Cena en restaurante" value={description} onChangeText={setDescription} />
            </View>

            <View>
              <Text style={styles.label}>¿Cuánto fue?</Text>
              <TextInput style={styles.input} placeholder="$ 0,00" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            </View>

            <View>
              <Text style={styles.label}>¿Quién pagó?</Text>
              <View style={styles.chipsRow}>
                {trip.members.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    style={[styles.chip, paidById === m.userId && styles.chipActive]}
                    onPress={() => setPaidById(m.userId)}
                  >
                    <Text style={[styles.chipText, paidById === m.userId && styles.chipTextActive]}>{displayName(m.user)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.label}>¿Entre quiénes se divide?</Text>
              <View style={styles.chipsRow}>
                {trip.members.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    style={[styles.chip, splitBetween.includes(m.userId) && styles.chipActive]}
                    onPress={() => toggleMember(m.userId)}
                  >
                    <Text style={[styles.chipText, splitBetween.includes(m.userId) && styles.chipTextActive]}>{displayName(m.user)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.label}>Notas (opcional)</Text>
              <TextInput style={styles.input} placeholder="Cena del primer día" value={notes} onChangeText={setNotes} />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar gasto"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabs: { flexDirection: "row", backgroundColor: "#e8e6df", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.green },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: "white" },
  dropzone: { borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", borderRadius: 14, alignItems: "center", padding: 40, gap: 4 },
  dropzoneTitle: { fontWeight: "600", color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted },
  receiptOk: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: "white" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: colors.green, backgroundColor: "#e8f7ee" },
  chipText: { fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.greenDark, fontWeight: "600" },
  submitButton: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 4 },
  submitText: { color: "white", textAlign: "center", fontWeight: "700" },
});
