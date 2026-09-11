import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTrip } from "../context/TripContext";
import { Expense, Payment } from "../lib/types";
import { useThemeColors } from "../context/ThemeContext";
import { displayName, formatDate, money } from "../lib/format";

interface BreakdownRow {
  key: string;
  date: string;
  description: string;
  subtitle: string;
  amount: number;
  payment?: Payment;
}

export function BalanceDetailScreen({ navigation }: any) {
  const { colors } = useThemeColors();
  const { trip } = useTrip();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!trip) return;
    api.listExpenses(trip.id).then(setExpenses);
    api.listPayments(trip.id).then(setPayments);
  }, [trip]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!trip || !user) return null;

  const loading = expenses === null || payments === null;

  const expenseRows: BreakdownRow[] = (expenses ?? [])
    .map((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === user.id);
      const paid = expense.paidBy.id === user.id ? expense.amount : 0;
      const owed = mySplit ? mySplit.amountOwed : 0;
      return {
        key: `expense-${expense.id}`,
        date: expense.expenseDate,
        description: expense.description,
        subtitle: `${formatDate(expense.expenseDate)} · Pagó: ${expense.paidBy.id === user.id ? "vos" : displayName(expense.paidBy)}`,
        amount: paid - owed,
      };
    })
    .filter((row) => Math.abs(row.amount) > 0.005);

  const paymentRows: BreakdownRow[] = (payments ?? [])
    .filter((p) => p.fromUser.id === user.id || p.toUser.id === user.id)
    .map((p) => {
      const iPaid = p.fromUser.id === user.id;
      return {
        key: `payment-${p.id}`,
        date: p.createdAt,
        description: iPaid ? `Le pagaste a ${displayName(p.toUser)}` : `${displayName(p.fromUser)} te pagó`,
        subtitle: formatDate(p.createdAt),
        amount: iPaid ? p.amount : -p.amount,
        payment: p,
      };
    });

  const rows = [...expenseRows, ...paymentRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = rows.reduce((s, r) => s + r.amount, 0);

  async function undoPayment(payment: Payment) {
    if (!trip) return;
    setUndoingId(payment.id);
    try {
      await api.deletePayment(trip.id, payment.id);
      reload();
    } catch (e: any) {
      Alert.alert("No se pudo deshacer", e.message);
    } finally {
      setUndoingId(null);
    }
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 10 },
    empty: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 24 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
    rowAmount: { fontSize: 14, fontWeight: "700" },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
    footerLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
    footerAmount: { fontSize: 18, fontWeight: "800" },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cómo se compone tu saldo</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.green} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {rows.length === 0 && <Text style={styles.empty}>No participaste de ningún gasto ni pago todavía.</Text>}
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.description}</Text>
                <Text style={styles.rowSub}>{row.subtitle}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.rowAmount, { color: row.amount >= 0 ? colors.greenDark : colors.danger }]}>
                  {row.amount >= 0 ? "+" : ""}
                  {money(row.amount)}
                </Text>
                {row.payment && (
                  <TouchableOpacity onPress={() => undoPayment(row.payment!)} disabled={undoingId === row.payment.id} hitSlop={8}>
                    <Feather name="rotate-ccw" size={15} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
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
