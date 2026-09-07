import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api } from "../lib/api";
import { Trip, TripSummary, Settlement } from "../lib/types";
import { colors } from "../lib/theme";
import { displayName, money } from "../lib/format";
import { Avatar } from "../components/Avatar";

export function ParticipantsScreen({ navigation }: any) {
  const { trip: tripFromContext } = useTrip();
  const [trip, setTrip] = useState<Trip | null>(tripFromContext);
  const [summary, setSummary] = useState<TripSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!tripFromContext) return;
      api.getTrip(tripFromContext.id).then(setTrip);
      api.getSummary(tripFromContext.id).then(setSummary);
    }, [tripFromContext])
  );

  if (!tripFromContext) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Participantes</Text>
          <TouchableOpacity style={styles.inviteButton} onPress={() => navigation.navigate("Invitar")}>
            <Feather name="user-plus" size={13} color="white" />
            <Text style={styles.inviteButtonText}> Invitar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {trip?.members.map((m) => {
            const balance = summary?.balances.find((b) => b.userId === m.userId);
            return (
              <View key={m.id} style={styles.row}>
                <Avatar userId={m.userId} name={displayName(m.user)} color={m.user.avatarColor} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{displayName(m.user)}</Text>
                  <Text style={styles.role}>{m.role === "ORGANIZER" ? "Organizador/a" : "Integrante"}</Text>
                </View>
                {balance && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.balance, { color: balance.balance >= 0 ? colors.greenDark : colors.danger }]}>
                      {balance.balance >= 0 ? "+ " : "- "}
                      {money(Math.abs(balance.balance))}
                    </Text>
                    <Text style={styles.detail}>
                      Pagó {money(balance.paid)} · Debe {money(balance.owed)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {summary && summary.settlements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Para saldar cuentas</Text>
            {summary.settlements.map((s: Settlement, i: number) => (
              <View key={i} style={styles.settlementRow}>
                <Text style={styles.settlementText}>
                  <Text style={{ fontWeight: "700" }}>{s.fromName}</Text> le debe a{" "}
                  <Text style={{ fontWeight: "700" }}>{s.toName}</Text>
                </Text>
                <Text style={styles.settlementAmount}>{money(s.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  inviteButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  inviteButtonText: { color: "white", fontWeight: "600", fontSize: 12 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.background },
  name: { fontWeight: "600", color: colors.text },
  role: { fontSize: 12, color: colors.muted, marginTop: 2 },
  balance: { fontWeight: "700" },
  detail: { fontSize: 11, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontWeight: "700", color: colors.text, marginBottom: 8 },
  settlementRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  settlementText: { fontSize: 13, color: colors.text, flex: 1, marginRight: 8 },
  settlementAmount: { fontWeight: "700", color: colors.text },
});
