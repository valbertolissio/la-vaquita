import { Image } from "react-native";

interface LogoProps {
  size?: number;
}

export function Logo({ size = 32 }: LogoProps) {
  return <Image source={require("../../assets/logo.png")} style={{ width: size, height: size }} resizeMode="contain" />;
}
