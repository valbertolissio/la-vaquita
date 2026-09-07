import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTrip } from "../context/TripContext";
import { Expense } from "../lib/types";
import { colors } from "../lib/theme";
import { displayName, formatDate, money } from "../lib/format";

interface BreakdownRow {
  expense: Expense;
  amount: number;
}

export function BalanceDetailScreen({ navigation }: any) {
  const { trip } = useTrip();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);

  useEffect(() => {
    if (trip) api.listExpenses(trip.id).then(setExpenses);
  }, [trip]);

  if (!trip || !user) return null;

  const rows: BreakdownRow[] = (expenses ?? [])
    .map((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === user.id);
      const paid = expense.paidBy.id === user.id ? expense.amount : 0;
      const owed = mySplit ? mySplit.amountOwed : 0;
      return { expense, amount: paid - owed };
    })
    .filter((row) => Math.abs(row.amount) > 0.005);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cómo se compone tu saldo</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {expenses === null ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.green} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {rows.length === 0 && <Text style={styles.empty}>No participaste de ningún gasto todavía.</Text>}
          {rows.map(({ expense, amount }) => (
            <View key={expense.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{expense.description}</Text>
                <Text style={styles.rowSub}>
                  {formatDate(expense.expenseDate)} · Pagó: {expense.paidBy.id === user.id ? "vos" : displayName(expense.paidBy)}
                </Text>
              </View>
              <Text style={[styles.rowAmount, { color: amount >= 0 ? colors.greenDark : colors.danger }]}>
                {amount >= 0 ? "+" : ""}
                {money(amount)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Total</Text>
        <Text style={[styles.footerAmount, { color: total >= 0 ? colors.greenDark : colors.danger }]}>
          {total >= 0 ? "+" : ""}
          {money(total)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "white" },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  content: { padding: 16, gap: 10 },
  empty: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 24 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "white" },
  footerLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  footerAmount: { fontSize: 18, fontWeight: "800" },
});
