import { Feather } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/Contexto/AuthContext";
import { TripProvider, useTrip } from "./src/Contexto/TripContext";
import { ThemeProvider, useThemeColors } from "./src/Contexto/ThemeContext";
import { LoginScreen } from "./src/Vista/LoginScreen";
import { RegisterScreen } from "./src/Vista/RegisterScreen";
import { ForgotPasswordScreen } from "./src/Vista/ForgotPasswordScreen";
import { TripsListScreen } from "./src/Vista/TripsListScreen";
import { NewTripScreen } from "./src/Vista/NewTripScreen";
import { HomeScreen } from "./src/Vista/HomeScreen";
import { ExpensesScreen } from "./src/Vista/ExpensesScreen";
import { TasksScreen } from "./src/Vista/TasksScreen";
import { ParticipantsScreen } from "./src/Vista/ParticipantsScreen";
import { NewExpenseScreen } from "./src/Vista/NewExpenseScreen";
import { NewTaskScreen } from "./src/Vista/NewTaskScreen";
import { InviteScreen } from "./src/Vista/InviteScreen";
import { EditTripScreen } from "./src/Vista/EditTripScreen";
import { BalanceDetailScreen } from "./src/Vista/BalanceDetailScreen";
import { EditProfileScreen } from "./src/Vista/EditProfileScreen";
import { SettingsScreen } from "./src/Vista/SettingsScreen";
import { ResumenScreen } from "./src/Vista/ResumenScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Inicio: "home",
  Gastos: "dollar-sign",
  Tareas: "clipboard",
  Participantes: "users",
};

function TripTabs() {
  const { colors } = useThemeColors();
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
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Gastos" component={ExpensesScreen} />
      <Tab.Screen name="Tareas" component={TasksScreen} />
      <Tab.Screen name="Participantes" component={ParticipantsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { trip } = useTrip();
  const { mode, colors } = useThemeColors();

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
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !trip ? (
          <>
            <Stack.Screen name="Proyectos" component={TripsListScreen} />
            <Stack.Screen name="Nuevo proyecto" component={NewTripScreen} options={{ headerShown: false, presentation: "modal" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TripTabs} />
            <Stack.Screen name="Gasto nuevo" component={NewExpenseScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Tarea nueva" component={NewTaskScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Invitar" component={InviteScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Editar proyecto" component={EditTripScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Detalle de saldo" component={BalanceDetailScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Mi perfil" component={EditProfileScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Ajustes" component={SettingsScreen} options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="Resumen" component={ResumenScreen} options={{ headerShown: false, presentation: "modal" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <TripProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </TripProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
