import { useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../Contexto/TripContext";
import { api } from "../Utilidades/api";
import { useThemeColors } from "../Contexto/ThemeContext";
import { Category, Expense } from "../Utilidades/types";
import { displayName, money } from "../Utilidades/format";

function formatShort(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function NewExpenseScreen({ navigation, route }: any) {
  const { colors, mode } = useThemeColors();
  const { trip } = useTrip();
  const expense: Expense | undefined = route?.params?.expense;
  const isEditing = !!expense;

  const [tab, setTab] = useState<"manual" | "ocr">("manual");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [categories, setCategories] = useState<Category[]>(trip?.categories ?? []);
  const [categoryId, setCategoryId] = useState(expense?.category?.id ?? trip?.categories[0]?.id ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [payerIds, setPayerIds] = useState<string[]>(
    expense && expense.payers.length > 0 ? expense.payers.map((p) => p.userId) : [trip?.members[0]?.userId ?? ""]
  );
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(
    expense ? Object.fromEntries(expense.payers.map((p) => [p.userId, String(p.amount)])) : {}
  );
  const [ocrPaidById, setOcrPaidById] = useState(trip?.members[0]?.userId ?? "");
  const [splitBetween, setSplitBetween] = useState<string[]>(
    expense ? expense.splits.map((s) => s.userId) : trip?.members.map((m) => m.userId) ?? []
  );
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanItems, setScanItems] = useState<{ description: string; amount: string; checked: boolean }[]>([]);
  // Total que leyó el OCR del pie del ticket, para contrastarlo con la suma de
  // los ítems y avisar si alguno se leyó mal.
  const [scanTotal, setScanTotal] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  function toggleMember(userId: string) {
    setSplitBetween((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function togglePayer(userId: string) {
    setPayerIds((prev) => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  }

  function updatePayerAmount(userId: string, value: string) {
    setPayerAmounts((prev) => ({ ...prev, [userId]: value }));
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim() || !trip) return;
    setCreatingCategory(true);
    try {
      const created = await api.createCategory(trip.id, { name: newCategoryName.trim() });
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (e: any) {
      Alert.alert("No se pudo crear la categoría", e.message);
    } finally {
      setCreatingCategory(false);
    }
  }

  function pickReceipt() {
    Alert.alert("Comprobante", "¿Cómo querés cargar el ticket?", [
      { text: "Sacar foto", onPress: () => pickReceiptFrom("camera") },
      { text: "Elegir de la galería", onPress: () => pickReceiptFrom("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function pickReceiptFrom(source: "camera" | "library") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso necesario", "Necesitamos acceso a la cámara para escanear el ticket.");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos para elegir el ticket.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled) return;

    setScanning(true);
    setScanNotice(null);
    try {
      // Las fotos del iPhone (cámara o galería) vienen en HEIC, que el
      // servidor no puede leer para el OCR — se convierten a JPEG acá antes
      // de subir.
      const converted = await ImageManipulator.manipulateAsync(result.assets[0].uri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.8,
      });
      const uri = converted.uri;
      setReceiptUri(uri);

      const scan = await api.scanReceipt(trip!.id, uri);
      setReceiptUrl(scan.receiptUrl);
      if (scan.expenseDate) setExpenseDate(new Date(scan.expenseDate));

      if (scan.items && scan.items.length > 0) {
        setScanItems(scan.items.map((it) => ({ description: it.description, amount: String(it.amount), checked: true })));
        // Solo se guarda si es el total impreso en el ticket. Si el ticket no
        // tiene línea de total, `amount` es apenas el número más grande que se
        // leyó, y compararlo con la suma de los ítems no dice nada.
        setScanTotal(scan.totalConfiable ? scan.amount ?? null : null);
      } else {
        if (scan.merchant) setDescription(scan.merchant);
        if (scan.amount) setAmount(String(scan.amount));
        setScanNotice(
          scan.amount || scan.merchant
            ? "Revisá los datos que completamos automáticamente antes de guardar."
            : "No pudimos leer bien el ticket. Completá los datos a mano."
        );
        setTab("manual");
      }
    } catch (e: any) {
      Alert.alert("No se pudo leer el ticket", e.message);
    } finally {
      setScanning(false);
    }
  }

  function toggleItem(index: number) {
    setScanItems((prev) => prev.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it)));
  }

  function updateItem(index: number, field: "description" | "amount", value: string) {
    setScanItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function removeItem(index: number) {
    setScanItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetScan() {
    setScanItems([]);
    setScanTotal(null);
    setReceiptUri(null);
    setReceiptUrl(null);
  }

  function sumaItemsElegidos() {
    return scanItems.filter((it) => it.checked).reduce((s, it) => s + (Number(it.amount) || 0), 0);
  }

  async function handleSubmitItems() {
    const checked = scanItems.filter((it) => it.checked);
    if (checked.length === 0) {
      Alert.alert("Faltan datos", "Elegí al menos un ítem.");
      return;
    }
    if (splitBetween.length === 0) {
      Alert.alert("Faltan datos", "Elegí entre quiénes se divide.");
      return;
    }
    for (const item of checked) {
      if (!item.description.trim() || !item.amount || Number(item.amount) <= 0) {
        Alert.alert("Faltan datos", "Revisá que cada ítem tenga descripción y monto.");
        return;
      }
    }
    setSubmitting(true);
    try {
      for (const item of checked) {
        const itemAmount = Number(item.amount);
        await api.createExpense(trip!.id, {
          description: item.description.trim(),
          amount: itemAmount,
          categoryId: categoryId || undefined,
          payers: [{ userId: ocrPaidById, amount: itemAmount }],
          splitBetween,
          expenseDate: expenseDate?.toISOString(),
          receiptUrl: receiptUrl ?? undefined,
          source: "OCR" as const,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("No se pudo guardar", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!trip) return;
    if (!description || !amount || Number(amount) <= 0 || splitBetween.length === 0) {
      Alert.alert("Faltan datos", "Completá descripción, monto y entre quiénes se divide.");
      return;
    }
    const totalAmount = Number(amount);
    let finalPayers: { userId: string; amount: number }[];
    if (payerIds.length === 1) {
      finalPayers = [{ userId: payerIds[0], amount: totalAmount }];
    } else {
      finalPayers = payerIds.map((id) => ({ userId: id, amount: Number(payerAmounts[id]) || 0 }));
      const sum = Math.round(finalPayers.reduce((s, p) => s + p.amount, 0) * 100) / 100;
      if (finalPayers.some((p) => p.amount <= 0)) {
        Alert.alert("Faltan datos", "Completá cuánto pagó cada persona.");
        return;
      }
      if (Math.abs(sum - totalAmount) > 0.01) {
        Alert.alert("Los montos no coinciden", `La suma de lo que pagó cada persona (${sum}) no coincide con el total (${totalAmount}).`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        description,
        amount: totalAmount,
        categoryId: categoryId || undefined,
        payers: finalPayers,
        splitBetween,
        notes: notes || undefined,
        expenseDate: expenseDate?.toISOString(),
        receiptUrl: receiptUrl ?? undefined,
        source: receiptUrl ? ("OCR" as const) : undefined,
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    tabs: { flexDirection: "row", backgroundColor: colors.border, borderRadius: 10, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    tabActive: { backgroundColor: colors.green },
    tabText: { fontSize: 12, fontWeight: "600", color: colors.muted },
    tabTextActive: { color: "white" },
    dropzone: { borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", borderRadius: 14, alignItems: "center", padding: 40, gap: 4 },
    dropzoneTitle: { fontWeight: "600", color: colors.text },
    cardSub: { fontSize: 12, color: colors.muted },
    receiptOk: { flexDirection: "row", alignItems: "center", gap: 6 },
    scanNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: mode === "dark" ? "rgba(245,158,11,0.14)" : "#fffbeb", borderRadius: 10, padding: 10 },
    scanNoticeText: { fontSize: 12, color: "#b45309", fontWeight: "600", flex: 1 },
    doneButton: { alignSelf: "flex-end", padding: 8 },
    doneText: { color: colors.greenDark, fontWeight: "600" },
    label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: colors.surface, color: colors.text },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    chipActive: { borderColor: colors.green, backgroundColor: mode === "dark" ? "rgba(46,158,91,0.15)" : "#e8f7ee" },
    chipText: { fontSize: 12, color: colors.muted },
    chipTextActive: { color: colors.greenDark, fontWeight: "600" },
    submitButton: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 4 },
    submitText: { color: "white", textAlign: "center", fontWeight: "700" },
    itemsTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
    itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    itemCheckbox: { paddingTop: 12 },
    itemDeleteButton: { paddingTop: 12 },
    rescanButton: { padding: 8 },
    rescanText: { textAlign: "center", color: colors.muted, fontSize: 12, fontWeight: "500" },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hint: { fontSize: 11, color: colors.muted },
    payerAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    payerAmountName: { flex: 1, fontSize: 13, color: colors.text },
    payerAmountInput: { width: 110, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 13, backgroundColor: colors.surface, color: colors.text },
    categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    addCategoryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    addCategoryInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 13, backgroundColor: colors.surface, color: colors.text },
    addCategoryButton: { backgroundColor: colors.green, borderRadius: 10, padding: 10 },
  });

  function renderCategoryPicker() {
    return (
      <View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Categoría</Text>
          <TouchableOpacity onPress={() => setAddingCategory((v) => !v)}>
            <Text style={[styles.hint, { color: colors.greenDark, fontWeight: "600" }]}>{addingCategory ? "Cancelar" : "+ Nueva categoría"}</Text>
          </TouchableOpacity>
        </View>
        {addingCategory ? (
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.addCategoryInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Nombre de la categoría"
              onSubmitEditing={handleAddCategory}
            />
            <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory} disabled={creatingCategory || !newCategoryName.trim()}>
              <Feather name="plus" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chipsRow}>
            {categories.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.categoryChip, categoryId === c.id && styles.chipActive]} onPress={() => setCategoryId(c.id)}>
                <View style={[styles.categoryDot, { backgroundColor: c.color ?? "#94a3b8" }]} />
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{isEditing ? "Editar gasto" : "Gasto nuevo"}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

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
          scanItems.length > 0 ? (
            <>
              <Text style={styles.itemsTitle}>Encontramos {scanItems.length} ítems en el ticket</Text>

              {scanTotal !== null && Math.abs(sumaItemsElegidos() - scanTotal) > 1 && (
                <View style={styles.scanNotice}>
                  <Feather name="alert-triangle" size={12} color="#b45309" />
                  <Text style={styles.scanNoticeText}>
                    La suma de los ítems ({money(sumaItemsElegidos())}) no coincide con el total del ticket ({money(scanTotal)}). Revisá los
                    montos antes de guardar.
                  </Text>
                </View>
              )}

              {scanItems.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <TouchableOpacity style={styles.itemCheckbox} onPress={() => toggleItem(idx)} hitSlop={8}>
                    <Feather name={item.checked ? "check-square" : "square"} size={20} color={item.checked ? colors.green : colors.muted} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, gap: 6 }}>
                    <TextInput
                      style={styles.input}
                      value={item.description}
                      onChangeText={(v) => updateItem(idx, "description", v)}
                      placeholder="Descripción"
                    />
                    <TextInput
                      style={styles.input}
                      value={item.amount}
                      onChangeText={(v) => updateItem(idx, "amount", v)}
                      keyboardType="numeric"
                      placeholder="$ 0,00"
                    />
                  </View>
                  <TouchableOpacity style={styles.itemDeleteButton} onPress={() => removeItem(idx)} hitSlop={8}>
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {renderCategoryPicker()}

              <View>
                <Text style={styles.label}>¿Quién pagó?</Text>
                <View style={styles.chipsRow}>
                  {trip.members.map((m) => (
                    <TouchableOpacity
                      key={m.userId}
                      style={[styles.chip, ocrPaidById === m.userId && styles.chipActive]}
                      onPress={() => setOcrPaidById(m.userId)}
                    >
                      <Text style={[styles.chipText, ocrPaidById === m.userId && styles.chipTextActive]}>{displayName(m.user)}</Text>
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

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitItems} disabled={submitting}>
                <Text style={styles.submitText}>
                  {submitting ? "Guardando..." : `Crear ${scanItems.filter((it) => it.checked).length} gastos`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.rescanButton} onPress={resetScan}>
                <Text style={styles.rescanText}>Escanear otro ticket</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.dropzone} onPress={pickReceipt} disabled={scanning}>
              {scanning ? (
                <>
                  <ActivityIndicator color={colors.green} />
                  <Text style={styles.dropzoneTitle}>Leyendo el ticket...</Text>
                </>
              ) : (
                <>
                  <Feather name="camera" size={28} color={colors.muted} />
                  <Text style={styles.dropzoneTitle}>Sacá una foto del ticket</Text>
                  <Text style={styles.cardSub}>o elegí de tu galería</Text>
                </>
              )}
            </TouchableOpacity>
          )
        ) : (
          <>
            {receiptUri && (
              <View style={styles.receiptOk}>
                <Feather name="check-circle" size={14} color={colors.greenDark} />
                <Text style={styles.cardSub}>Comprobante adjuntado</Text>
              </View>
            )}
            {scanNotice && (
              <View style={styles.scanNotice}>
                <Feather name="check" size={12} color="#b45309" />
                <Text style={styles.scanNoticeText}>{scanNotice}</Text>
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
              <Text style={styles.label}>Fecha (opcional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ fontSize: 14, color: colors.text }}>{expenseDate ? formatShort(expenseDate) : "Hoy"}</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={expenseDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_event, date) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (date) setExpenseDate(date);
                }}
              />
            )}
            {showDatePicker && Platform.OS === "ios" && (
              <TouchableOpacity style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneText}>Listo</Text>
              </TouchableOpacity>
            )}

            {renderCategoryPicker()}

            <View>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>¿Quién pagó?</Text>
                <Text style={styles.hint}>Tocá para sumar a más de uno</Text>
              </View>
              <View style={styles.chipsRow}>
                {trip.members.map((m) => (
                  <TouchableOpacity key={m.userId} style={[styles.chip, payerIds.includes(m.userId) && styles.chipActive]} onPress={() => togglePayer(m.userId)}>
                    <Text style={[styles.chipText, payerIds.includes(m.userId) && styles.chipTextActive]}>{displayName(m.user)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {payerIds.length > 1 && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {payerIds.map((id) => {
                    const member = trip.members.find((m) => m.userId === id);
                    if (!member) return null;
                    return (
                      <View key={id} style={styles.payerAmountRow}>
                        <Text style={styles.payerAmountName}>{displayName(member.user)}</Text>
                        <TextInput
                          style={styles.payerAmountInput}
                          value={payerAmounts[id] ?? ""}
                          onChangeText={(v) => updatePayerAmount(id, v)}
                          keyboardType="numeric"
                          placeholder="$ 0,00"
                        />
                      </View>
                    );
                  })}
                </View>
              )}
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
