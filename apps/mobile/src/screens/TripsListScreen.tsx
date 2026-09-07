import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useTrip } from "../context/TripContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../lib/theme";
import { Logo } from "../components/Logo";

export function TripsListScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[] | null>(null);
  const { setTrip } = useTrip();
  const { logout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      api.listTrips().then(setTrips);
    }, [])
  );

  async function selectTrip(tripId: string) {
    const trip = await api.getTrip(tripId);
    setTrip(trip);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Logo size={26} />
          <Text style={styles.title}>Tus viajes</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newTripButton} onPress={() => navigation.navigate("Nuevo viaje")}>
        <Feather name="plus" size={16} color="white" />
        <Text style={styles.newTripText}>Nuevo viaje</Text>
      </TouchableOpacity>

      <FlatList
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          trips === null ? (
            <Text style={styles.empty}>Cargando tus viajes...</Text>
          ) : (
            <Text style={styles.empty}>Todavía no tenés viajes creados.</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => selectTrip(item.id)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>{item.members.length} participantes</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  logout: { color: colors.muted, fontSize: 13 },
  newTripButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.green,
    borderRadius: 10,
    marginHorizontal: 16,
    paddingVertical: 12,
  },
  newTripText: { color: "white", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
});
