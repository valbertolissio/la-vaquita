import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { api } from "../Utilidades/api";
import { useProyecto } from "../Contexto/ContextoDeProyecto";
import { useColoresDelTema } from "../Contexto/ContextoDeTema";
import { Categoria } from "../Utilidades/tipos";

function formatShort(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function PantallaEditarProyecto({ navigation }: any) {
  const { colors } = useColoresDelTema();
  const { trip, setTrip } = useProyecto();
  const [name, setName] = useState(trip?.name ?? "");
  const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate) : new Date());
  const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate) : new Date());
  const [pickerOpen, setPickerOpen] = useState<"start" | "end" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<Categoria[]>(trip?.categories ?? []);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);

  if (!trip) return null;

  function syncCategories(next: Categoria[]) {
    setCategories(next);
    setTrip({ ...trip!, categories: next });
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await api.crearCategoria(trip!.id, { name: newCategoryName.trim() });
      syncCategories([...categories, created]);
      setNewCategoryName("");
    } catch (e: any) {
      Alert.alert("No se pudo crear la categoría", e.message);
    } finally {
      setAddingCategory(false);
    }
  }

  function handleCategoryNameChange(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  async function handleRenameCategory(category: Categoria) {
    const original = trip!.categories.find((c) => c.id === category.id);
    if (!category.name.trim() || category.name === original?.name) return;
    setBusyCategoryId(category.id);
    try {
      const updated = await api.actualizarCategoria(trip!.id, category.id, { name: category.name.trim() });
      syncCategories(categories.map((c) => (c.id === category.id ? updated : c)));
    } catch (e: any) {
      Alert.alert("No se pudo renombrar", e.message);
    } finally {
      setBusyCategoryId(null);
    }
  }

  function confirmDeleteCategory(category: Categoria) {
    Alert.alert("Eliminar categoría", `¿Eliminar "${category.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setBusyCategoryId(category.id);
          try {
            await api.eliminarCategoria(trip!.id, category.id);
            syncCategories(categories.filter((c) => c.id !== category.id));
          } catch (e: any) {
            Alert.alert("No se pudo eliminar", e.message);
          } finally {
            setBusyCategoryId(null);
          }
        },
      },
    ]);
  }

  async function handleSave() {
    if (!trip) return;
    if (!name.trim()) {
      Alert.alert("Faltan datos", "Ponele un nombre al proyecto.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Fechas inválidas", "La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.actualizarProyecto(trip.id, {
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14 },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    row: { flexDirection: "row", gap: 10 },
    label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.surface, justifyContent: "center", color: colors.text },
    dateText: { fontSize: 14, color: colors.text },
    doneButton: { alignSelf: "flex-end", padding: 8 },
    doneText: { color: colors.greenDark, fontWeight: "600" },
    button: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 4 },
    buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
    cancelButton: { padding: 10 },
    cancelText: { color: colors.muted, textAlign: "center", fontSize: 13 },
    categorySection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, gap: 8 },
    categoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    categoryDot: { width: 10, height: 10, borderRadius: 5 },
    categoryInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 13, backgroundColor: colors.surface, color: colors.text },
    addCategoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    addCategoryButton: { backgroundColor: colors.border, borderRadius: 10, padding: 10 },
    hint: { fontSize: 11, color: colors.muted },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editar proyecto</Text>

        <View>
          <Text style={styles.label}>Nombre del proyecto</Text>
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

        <View style={styles.categorySection}>
          <Text style={styles.label}>Categorías de gasto</Text>
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: category.color ?? "#94a3b8" }]} />
              <TextInput
                style={styles.categoryInput}
                value={category.name}
                onChangeText={(v) => handleCategoryNameChange(category.id, v)}
                onBlur={() => handleRenameCategory(category)}
                editable={busyCategoryId !== category.id}
              />
              <TouchableOpacity onPress={() => confirmDeleteCategory(category)} disabled={busyCategoryId === category.id} hitSlop={8}>
                <Feather name="trash-2" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.categoryInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Nueva categoría"
              onSubmitEditing={handleAddCategory}
            />
            <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory} disabled={addingCategory || !newCategoryName.trim()}>
              <Feather name="plus" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>No se puede eliminar una categoría que ya tiene gastos cargados.</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Guardando..." : "Guardar cambios"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
