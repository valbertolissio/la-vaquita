import { useEffect, useState } from "react";
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
  const [link, setLink] = useState<string | null>(null);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: boolean; to: string } | null>(null);

  useEffect(() => {
    if (!trip) return;
    api
      .inviteMember(trip.id)
      .then((invitation) => setLink(`${WEB_ORIGIN}/invite/${invitation.token}`))
      .catch((e: any) => Alert.alert("No se pudo generar la invitación", e.message));
  }, [trip]);

  if (!trip) return null;

  function shareMessage() {
    return `Te invito a sumarte a "${trip!.name}" en La Vaquita: ${link}`;
  }

  async function shareLink() {
    if (!link) return;
    await Share.share({ message: shareMessage() });
  }

  async function sendByEmail() {
    if (!email.trim() || !trip) return;
    setEmailSubmitting(true);
    try {
      const invitation = await api.inviteMember(trip.id, email.trim());
      setEmailResult({ sent: !!invitation.emailSent, to: email.trim() });
    } catch (e: any) {
      Alert.alert("No se pudo mandar el email", e.message);
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Invitar participante</Text>

        {!link ? (
          <Text style={styles.helper}>Generando link de invitación...</Text>
        ) : (
          <>
            <Text style={styles.helper}>Compartí este link con quien quieras sumar al proyecto:</Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {link}
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={shareLink}>
              <Feather name="share-2" size={16} color="white" />
              <Text style={styles.buttonText}> Compartir (WhatsApp, Instagram, etc.)</Text>
            </TouchableOpacity>

            <View style={styles.emailSection}>
              {!showEmailForm && !emailResult && (
                <TouchableOpacity style={styles.emailToggle} onPress={() => setShowEmailForm(true)}>
                  <Feather name="mail" size={14} color={colors.greenDark} />
                  <Text style={styles.emailToggleText}> También mandarla por email</Text>
                </TouchableOpacity>
              )}
              {showEmailForm && !emailResult && (
                <View style={styles.emailRow}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="email@ejemplo.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TouchableOpacity style={styles.emailSendButton} onPress={sendByEmail} disabled={emailSubmitting || !email.trim()}>
                    <Text style={styles.emailSendText}>{emailSubmitting ? "..." : "Mandar"}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {emailResult && (
                <Text style={styles.helper}>
                  {emailResult.sent ? `Le mandamos un email a ${emailResult.to}.` : `No pudimos mandar el email a ${emailResult.to} — probá el link.`}
                </Text>
              )}
            </View>
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
  emailSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  emailToggle: { flexDirection: "row", alignItems: "center" },
  emailToggleText: { color: colors.greenDark, fontWeight: "600", fontSize: 13 },
  emailRow: { flexDirection: "row", gap: 8 },
  emailInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: "white" },
  emailSendButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  emailSendText: { color: "white", fontWeight: "700", fontSize: 13 },
  cancelButton: { padding: 10 },
  cancelText: { color: colors.muted, textAlign: "center", fontSize: 13 },
});
