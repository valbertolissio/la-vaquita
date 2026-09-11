import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useTrip } from "../context/TripContext";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../context/ThemeContext";
import { Logo } from "../components/Logo";

export function TripsListScreen({ navigation }: any) {
  const { colors } = useThemeColors();
  const [trips, setTrips] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { setTrip } = useTrip();
  const { logout } = useAuth();

  const loadTrips = useCallback(() => {
    setLoadError(false);
    api
      .listTrips()
      .then(setTrips)
      .catch((e: any) => {
        setLoadError(true);
        Alert.alert("No se pudieron cargar tus proyectos", e.message);
      });
  }, []);

  useFocusEffect(loadTrips);

  async function selectTrip(tripId: string) {
    setOpeningId(tripId);
    try {
      const trip = await api.getTrip(tripId);
      setTrip(trip);
    } catch (e: any) {
      Alert.alert("No se pudo abrir el proyecto", e.message);
    } finally {
      setOpeningId(null);
    }
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
    card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
    empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
    errorBox: { alignItems: "center", marginTop: 40, gap: 10 },
    retryText: { color: colors.greenDark, fontWeight: "700", fontSize: 13 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Logo size={26} />
          <Text style={styles.title}>Tus proyectos</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newTripButton} onPress={() => navigation.navigate("Nuevo proyecto")}>
        <Feather name="plus" size={16} color="white" />
        <Text style={styles.newTripText}>Nuevo proyecto</Text>
      </TouchableOpacity>

      <FlatList
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          loadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.empty}>No se pudo conectar con el servidor.</Text>
              <TouchableOpacity onPress={loadTrips}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : trips === null ? (
            <Text style={styles.empty}>Cargando tus proyectos...</Text>
          ) : (
            <Text style={styles.empty}>Todavía no tenés proyectos creados.</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => selectTrip(item.id)} disabled={openingId === item.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.members.length} participantes</Text>
            </View>
            {openingId === item.id && <ActivityIndicator color={colors.green} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
