import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../Utilidades/api";
import { useColoresDelTema } from "../Contexto/ContextoDeTema";
import { Logo } from "../Componentes/Logo";

export function PantallaOlvideContrasena({ navigation }: any) {
  const { colors } = useColoresDelTema();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await api.olvideMiContrasena(email);
      setMessage(result.message);
    } catch (e: any) {
      Alert.alert("No se pudo enviar el link", e.message);
    } finally {
      setLoading(false);
    }
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy, justifyContent: "center", padding: 20 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
    logoWrap: { alignItems: "center" },
    title: { fontSize: 20, fontWeight: "700", textAlign: "center", color: colors.text, marginTop: 4 },
    subtitle: { fontSize: 13, textAlign: "center", color: colors.muted, marginTop: 4, marginBottom: 20 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: colors.text },
    button: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 6 },
    buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
    linkWrap: { marginTop: 14 },
    link: { textAlign: "center", color: colors.greenDark, fontSize: 13, fontWeight: "500" },
    message: { fontSize: 14, color: colors.text, textAlign: "center", lineHeight: 20 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Logo size={44} />
        </View>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>Te mandamos un link por email para elegir una nueva.</Text>

        {message ? (
          <Text style={styles.message}>{message}</Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Enviando..." : "Mandar link"}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
          <Text style={styles.link}>Volver a ingresar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
