import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import DashboardScreen from "../screens/DashboardScreen";
import ColaboradoresScreen from "../screens/ColaboradoresScreen";
import CreateColaboradorScreen from "../screens/CreateColaboradorScreen";
import SubestacoesScreen from "../screens/SubestacoesScreen";
import CreateSubestacaoScreen from "../screens/CreateSubestacaoScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import AuditoriaScreen from "../screens/AuditoriaScreen";
import SimuladorCatracaScreen from "../screens/SimuladorCatracaScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

function ColaboradoresStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ColaboradoresList" component={ColaboradoresScreen} />
      <Stack.Screen name="CreateColaborador" component={CreateColaboradorScreen} />
    </Stack.Navigator>
  );
}

function SubestacoesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SubestacoesList" component={SubestacoesScreen} />
      <Stack.Screen name="CreateSubestacao" component={CreateSubestacaoScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const isAdminOrGestor = user?.role === "admin" || user?.role === "gestor";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.cardBorder,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Início",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Catraca"
        component={SimuladorCatracaScreen}
        options={{
          tabBarLabel: "Catraca",
          tabBarIcon: ({ focused }) => <TabIcon icon="📶" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Subestacoes"
        component={SubestacoesStack}
        options={{
          tabBarLabel: "Subestações",
          tabBarIcon: ({ focused }) => <TabIcon icon="⚡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Colaboradores"
        component={ColaboradoresStack}
        options={{
          tabBarLabel: "Equipe",
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Historico"
        component={HistoricoScreen}
        options={{
          tabBarLabel: "Histórico",
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      {isAdminOrGestor && (
        <Tab.Screen
          name="Auditoria"
          component={AuditoriaScreen}
          options={{
            tabBarLabel: "Auditoria",
            tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" focused={focused} />,
          }}
        />
      )}
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
