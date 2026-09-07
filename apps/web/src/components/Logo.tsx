import logoSrc from "../assets/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return <img src={logoSrc} width={size} height={size} alt="La Vaquita" className={className} style={{ objectFit: "contain" }} />;
}
