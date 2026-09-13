import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../Utilidades/api";
import { useSesion } from "../Contexto/ContextoDeSesion";
import { useProyecto } from "../Contexto/ContextoDeProyecto";
import { Gasto, Pago } from "../Utilidades/tipos";
import { useColoresDelTema } from "../Contexto/ContextoDeTema";
import { nombreVisible, formatearFecha, plata, resumenDePagadores } from "../Utilidades/formato";

interface BreakdownRow {
  key: string;
  date: string;
  description: string;
  subtitle: string;
  amount: number;
  payment?: Pago;
}

export function PantallaDetalleDeSaldo({ navigation }: any) {
  const { colors } = useColoresDelTema();
  const insets = useSafeAreaInsets();
  const { trip } = useProyecto();
  const { user } = useSesion();
  const [expenses, setExpenses] = useState<Gasto[] | null>(null);
  const [payments, setPayments] = useState<Pago[] | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!trip) return;
    api.listarGastos(trip.id).then(setExpenses);
    api.listarPagos(trip.id).then(setPayments);
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
      const myPayment = expense.payers.find((p) => p.userId === user.id);
      const paid = myPayment ? myPayment.amount : 0;
      const owed = mySplit ? mySplit.amountOwed : 0;
      return {
        key: `expense-${expense.id}`,
        date: expense.expenseDate,
        description: expense.description,
        subtitle: `${formatearFecha(expense.expenseDate)} · Pagó: ${resumenDePagadores(expense.payers, user.id)}`,
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
        description: iPaid ? `Le pagaste a ${nombreVisible(p.toUser)}` : `${nombreVisible(p.fromUser)} te pagó`,
        subtitle: formatearFecha(p.createdAt),
        amount: iPaid ? Number(p.amount) : -Number(p.amount),
        payment: p,
      };
    });

  const rows = [...expenseRows, ...paymentRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = rows.reduce((s, r) => s + r.amount, 0);

  async function undoPayment(payment: Pago) {
    if (!trip) return;
    setUndoingId(payment.id);
    try {
      await api.eliminarPago(trip.id, payment.id);
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
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      paddingBottom: 16 + insets.bottom,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
    footerAmount: { fontSize: 18, fontWeight: "800" },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
                  {plata(row.amount)}
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
          {plata(total)}
        </Text>
      </View>
    </SafeAreaView>
  );
}
