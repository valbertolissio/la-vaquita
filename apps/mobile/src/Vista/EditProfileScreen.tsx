import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { AVATAR_COLOR_KEYS, AvatarColorKey, avatarColor, initials } from "../lib/format";
import { useThemeColors } from "../context/ThemeContext";

export function EditProfileScreen({ navigation }: any) {
  const { colors } = useThemeColors();
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [color, setColor] = useState<AvatarColorKey | null>((user?.avatarColor as AvatarColorKey) ?? null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim() || null, avatarColor: color });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("No se pudo guardar", e.message);
    } finally {
      setSaving(false);
    }
  }

  const previewName = nickname.trim() || user!.name;
  const previewColor = avatarColor(user!.id, color);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    content: { padding: 16, gap: 14 },
    previewWrap: { alignItems: "center", marginBottom: 6 },
    previewCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
    previewText: { color: "white", fontSize: 22, fontWeight: "700" },
    label: { fontSize: 12, color: colors.muted, fontWeight: "500" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.surface },
    swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    swatch: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    swatchSelected: { borderWidth: 3, borderColor: colors.text },
    button: { backgroundColor: colors.green, borderRadius: 10, padding: 14, marginTop: 8 },
    buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar perfil</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.previewWrap}>
          <View style={[styles.previewCircle, { backgroundColor: previewColor }]}>
            <Text style={styles.previewText}>{initials(previewName)}</Text>
          </View>
        </View>

        <Text style={styles.label}>Sobrenombre</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder={user!.name}
          maxLength={30}
        />

        <Text style={styles.label}>Color del avatar</Text>
        <View style={styles.swatchRow}>
          {AVATAR_COLOR_KEYS.map((key) => {
            const hex = avatarColor(user!.id, key);
            const selected = color === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setColor(key)}
                style={[styles.swatch, { backgroundColor: hex }, selected && styles.swatchSelected]}
              >
                {selected && <Feather name="check" size={16} color="white" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Guardando..." : "Guardar cambios"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
