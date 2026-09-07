import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { Expense } from "../lib/types";
import { colors } from "../lib/theme";
import { money, formatDate } from "../lib/format";
import { Avatar } from "../components/Avatar";

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Alimentación: "coffee",
  Transporte: "truck",
  Alojamiento: "home",
  Ocio: "smile",
  Otros: "tag",
};

export function ExpensesScreen({ navigation }: any) {
  const { trip } = useTrip();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);

  const reload = useCallback(() => {
    if (trip) api.listExpenses(trip.id).then(setExpenses);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!trip) return null;

  function confirmDelete(expense: Expense) {
    Alert.alert("Eliminar gasto", `¿Eliminar "${expense.description}"? Los saldos se recalculan automáticamente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await api.deleteExpense(trip!.id, expense.id);
          reload();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gastos</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("Gasto nuevo")}>
          <Feather name="plus" size={13} color="white" />
          <Text style={styles.addButtonText}> Gasto</Text>
        </TouchableOpacity>
      </View>
      {expenses && expenses.length > 0 && <Text style={styles.hint}>Tocá un gasto para editarlo, mantené presionado para eliminarlo.</Text>}
      <FlatList
        data={expenses ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          expenses === null ? (
            <Text style={styles.empty}>Cargando gastos...</Text>
          ) : (
            <Text style={styles.empty}>Todavía no hay gastos cargados.</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Gasto nuevo", { expense: item })}
            onLongPress={() => confirmDelete(item)}
          >
            <View style={styles.categoryIconWrap}>
              <Feather name={CATEGORY_ICONS[item.category?.name ?? "Otros"] ?? "tag"} size={16} color={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.description}</Text>
              <View style={styles.paidByRow}>
                <Avatar userId={item.paidBy.id} name={item.paidBy.name} size={16} />
                <Text style={styles.cardSub}> Pagó: {item.paidBy.name}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.amount}>{money(item.amount)}</Text>
              <Text style={styles.cardSub}>{formatDate(item.expenseDate)}</Text>
            </View>
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
  hint: { fontSize: 11, color: colors.muted, paddingHorizontal: 16 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  categoryIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "600", color: colors.text },
  paidByRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  cardSub: { fontSize: 12, color: colors.muted },
  amount: { fontWeight: "700", color: colors.text },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
