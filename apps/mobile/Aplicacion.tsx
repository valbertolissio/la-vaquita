import { Feather } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ProveedorDeSesion, useSesion } from "./src/Contexto/ContextoDeSesion";
import { ProveedorDeProyecto, useProyecto } from "./src/Contexto/ContextoDeProyecto";
import { ProveedorDeTema, useColoresDelTema } from "./src/Contexto/ContextoDeTema";
import { PantallaIngreso } from "./src/Vista/PantallaIngreso";
import { PantallaRegistro } from "./src/Vista/PantallaRegistro";
import { PantallaOlvideContrasena } from "./src/Vista/PantallaOlvideContrasena";
import { PantallaListaDeProyectos } from "./src/Vista/PantallaListaDeProyectos";
import { PantallaNuevoProyecto } from "./src/Vista/PantallaNuevoProyecto";
import { PantallaPanel } from "./src/Vista/PantallaPanel";
import { PantallaGastos } from "./src/Vista/PantallaGastos";
import { PantallaTareas } from "./src/Vista/PantallaTareas";
import { PantallaParticipantes } from "./src/Vista/PantallaParticipantes";
import { PantallaNuevoGasto } from "./src/Vista/PantallaNuevoGasto";
import { PantallaNuevaTarea } from "./src/Vista/PantallaNuevaTarea";
import { PantallaInvitar } from "./src/Vista/PantallaInvitar";
import { PantallaEditarProyecto } from "./src/Vista/PantallaEditarProyecto";
import { PantallaDetalleDeSaldo } from "./src/Vista/PantallaDetalleDeSaldo";
import { PantallaEditarPerfil } from "./src/Vista/PantallaEditarPerfil";
import { PantallaAjustes } from "./src/Vista/PantallaAjustes";
import { PantallaResumen } from "./src/Vista/PantallaResumen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Inicio: "home",
  Gastos: "dollar-sign",
  Tareas: "clipboard",
  Participantes: "users",
};

function TripTabs() {
  const { colors } = useColoresDelTema();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => <Feather name={TAB_ICONS[route.name]} color={color} size={size ?? 20} />,
      })}
    >
      <Tab.Screen name="Inicio" component={PantallaPanel} />
      <Tab.Screen name="Gastos" component={PantallaGastos} />
      <Tab.Screen name="Tareas" component={PantallaTareas} />
      <Tab.Screen name="Participantes" component={PantallaParticipantes} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useSesion();
  const { trip } = useProyecto();
  const { mode, colors } = useColoresDelTema();

  if (loading) return null;

  const navTheme = {
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      primary: colors.green,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={PantallaIngreso} />
            <Stack.Screen name="Register" component={PantallaRegistro} />
            <Stack.Screen name="ForgotPassword" component={PantallaOlvideContrasena} />
          </>
        ) : !trip ? (
          <>
            <Stack.Screen name="Proyectos" component={PantallaListaDeProyectos} />
            <Stack.Screen name="Nuevo proyecto" component={PantallaNuevoProyecto} options={{ headerShown: false, presentation: "modal" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TripTabs} />
            <Stack.Screen name="Gasto nuevo" component={PantallaNuevoGasto} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Tarea nueva" component={PantallaNuevaTarea} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Invitar" component={PantallaInvitar} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Editar proyecto" component={PantallaEditarProyecto} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Detalle de saldo" component={PantallaDetalleDeSaldo} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Mi perfil" component={PantallaEditarPerfil} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Ajustes" component={PantallaAjustes} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Resumen" component={PantallaResumen} options={{ headerShown: false, presentation: "modal" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function Aplicacion() {
  return (
    <SafeAreaProvider>
      <ProveedorDeTema>
        <ProveedorDeSesion>
          <ProveedorDeProyecto>
            <RootNavigator />
            <StatusBar style="auto" />
          </ProveedorDeProyecto>
        </ProveedorDeSesion>
      </ProveedorDeTema>
    </SafeAreaProvider>
  );
}
