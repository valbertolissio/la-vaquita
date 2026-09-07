import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors } from "../lib/theme";
import { Logo } from "../components/Logo";

export function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (e: any) {
      Alert.alert("No se pudo crear la cuenta", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Logo size={44} />
        </View>
        <Text style={styles.title}>Creá tu cuenta</Text>
        <Text style={styles.subtitle}>Organizá tu próximo viaje grupal</Text>

        <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Creando cuenta..." : "Crear cuenta"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
          <Text style={styles.link}>¿Ya tenés cuenta? Ingresá</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 24 },
  logoWrap: { alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 13, textAlign: "center", color: colors.muted, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14 },
  button: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 6 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
  linkWrap: { marginTop: 14 },
  link: { textAlign: "center", color: colors.greenDark, fontSize: 13, fontWeight: "500" },
});
