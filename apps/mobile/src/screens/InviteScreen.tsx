import { useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTrip } from "../context/TripContext";
import { api, API_URL } from "../lib/api";
import { colors } from "../lib/theme";

// La API no tiene dominio propio para deep links todavía: se comparte la misma
// URL que usa la web (/invite/:token), que ya sabe procesar la invitación.
// Se puede fijar EXPO_PUBLIC_WEB_URL a mano (ej. corriendo en modo túnel, donde
// la API y la web viven en dominios completamente distintos); si no, se deriva
// de la misma IP que ya detectamos para la API (mismo host, otro puerto).
const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL ?? API_URL.replace(":4000", ":5173");

export function InviteScreen({ navigation }: any) {
  const { trip } = useTrip();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  async function handleInvite() {
    if (!email.trim()) {
      Alert.alert("Falta el email", "Ingresá el email de la persona a invitar.");
      return;
    }
    setSubmitting(true);
    try {
      const invitation = await api.inviteMember(trip!.id, email.trim());
      setLink(`${WEB_ORIGIN}/invite/${invitation.token}`);
      setEmailSent(!!invitation.emailSent);
    } catch (e: any) {
      Alert.alert("No se pudo invitar", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function shareLink() {
    if (!link) return;
    await Share.share({ message: `Te invito a sumarte a "${trip!.name}" en La Vaquita: ${link}` });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Invitar participante</Text>

        {!link ? (
          <>
            <Text style={styles.label}>Email de la persona a invitar</Text>
            <TextInput
              style={styles.input}
              placeholder="email@ejemplo.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleInvite} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? "Generando..." : "Generar invitación"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.helper}>
              {emailSent ? (
                <>
                  Le mandamos un email a <Text style={{ fontWeight: "700" }}>{email}</Text> con la invitación. También
                  podés compartírsela directo:
                </>
              ) : (
                <>
                  Invitación creada para <Text style={{ fontWeight: "700" }}>{email}</Text>, pero no pudimos mandar el
                  email — compartísela directo:
                </>
              )}
            </Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {link}
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={shareLink}>
              <Feather name="share-2" size={16} color="white" />
              <Text style={styles.buttonText}> Compartir link</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>{link ? "Listo" : "Cancelar"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: "white" },
  helper: { fontSize: 13, color: colors.text },
  linkBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "white" },
  linkText: { fontSize: 12, color: colors.muted },
  button: { flexDirection: "row", backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
  cancelButton: { padding: 10 },
  cancelText: { color: colors.muted, textAlign: "center", fontSize: 13 },
});
