import { Feather } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { TripProvider, useTrip } from "./src/context/TripContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { TripsListScreen } from "./src/screens/TripsListScreen";
import { NewTripScreen } from "./src/screens/NewTripScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ExpensesScreen } from "./src/screens/ExpensesScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { ParticipantsScreen } from "./src/screens/ParticipantsScreen";
import { NewExpenseScreen } from "./src/screens/NewExpenseScreen";
import { NewTaskScreen } from "./src/screens/NewTaskScreen";
import { InviteScreen } from "./src/screens/InviteScreen";
import { colors } from "./src/lib/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Inicio: "home",
  Gastos: "dollar-sign",
  Tareas: "clipboard",
  Participantes: "users",
};

function TripTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
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

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !trip ? (
          <>
            <Stack.Screen name="Viajes" component={TripsListScreen} />
            <Stack.Screen name="Nuevo viaje" component={NewTripScreen} options={{ headerShown: true, presentation: "modal" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TripTabs} />
            <Stack.Screen name="Gasto nuevo" component={NewExpenseScreen} options={{ headerShown: true, presentation: "modal" }} />
            <Stack.Screen name="Tarea nueva" component={NewTaskScreen} options={{ headerShown: true, presentation: "modal" }} />
            <Stack.Screen name="Invitar" component={InviteScreen} options={{ headerShown: true, presentation: "modal" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TripProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </TripProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
