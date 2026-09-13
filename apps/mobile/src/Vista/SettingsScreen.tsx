import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../Contexto/AuthContext";
import { useTrip } from "../Contexto/TripContext";
import { useThemeColors } from "../Contexto/ThemeContext";
import { api } from "../Utilidades/api";

export function SettingsScreen({ navigation }: any) {
  const { colors, mode, toggleTheme } = useThemeColors();
  const { user } = useAuth();
  const { trip, setTrip } = useTrip();

  const isOrganizer = trip?.members.find((m) => m.userId === user?.id)?.role === "ORGANIZER";

  function confirmDeleteTrip() {
    if (!trip) return;
    Alert.alert("Eliminar proyecto", `¿Seguro que querés eliminar "${trip.name}"? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTrip(trip.id);
            setTrip(null);
          } catch (e: any) {
            Alert.alert("No se pudo eliminar", e.message);
          }
        },
      },
    ]);
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    content: { padding: 16, gap: 20 },
    sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
    card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    rowIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: mode === "dark" ? "rgba(46,158,91,0.15)" : "#e8f7ee" },
    rowText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    rowValue: { fontSize: 13, color: colors.muted },
    dangerIconWrap: { backgroundColor: mode === "dark" ? "rgba(239,68,68,0.14)" : "#fef2f2" },
    dangerText: { color: colors.danger },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View>
          <Text style={styles.sectionLabel}>Cuenta</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("Mi perfil")}>
              <View style={styles.rowIconWrap}>
                <Feather name="user" size={15} color={colors.greenDark} />
              </View>
              <Text style={styles.rowText}>Mi perfil</Text>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={toggleTheme}>
              <View style={styles.rowIconWrap}>
                <Feather name={mode === "dark" ? "moon" : "sun"} size={15} color={colors.greenDark} />
              </View>
              <Text style={styles.rowText}>Modo oscuro</Text>
              <Text style={styles.rowValue}>{mode === "dark" ? "Activado" : "Desactivado"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {trip && (
          <View>
            <Text style={styles.sectionLabel}>Proyecto</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.row} onPress={() => setTrip(null)}>
                <View style={styles.rowIconWrap}>
                  <Feather name="grid" size={15} color={colors.greenDark} />
                </View>
                <Text style={styles.rowText}>Volver a mis proyectos</Text>
                <Feather name="chevron-right" size={18} color={colors.muted} />
              </TouchableOpacity>
              {isOrganizer && (
                <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={() => navigation.navigate("Editar proyecto")}>
                  <View style={styles.rowIconWrap}>
                    <Feather name="edit-2" size={15} color={colors.greenDark} />
                  </View>
                  <Text style={styles.rowText}>Editar proyecto</Text>
                  <Feather name="chevron-right" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
              {isOrganizer && (
                <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={confirmDeleteTrip}>
                  <View style={[styles.rowIconWrap, styles.dangerIconWrap]}>
                    <Feather name="trash-2" size={15} color={colors.danger} />
                  </View>
                  <Text style={[styles.rowText, styles.dangerText]}>Eliminar proyecto</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
