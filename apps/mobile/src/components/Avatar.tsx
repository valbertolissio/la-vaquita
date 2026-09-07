import { StyleSheet, Text, View } from "react-native";
import { avatarColor, initials } from "../lib/format";

interface AvatarProps {
  userId: string;
  name: string;
  color?: string | null;
  size?: number;
}

export function Avatar({ userId, name, color, size = 32 }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(userId, color) },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { color: "white", fontWeight: "700" },
});
