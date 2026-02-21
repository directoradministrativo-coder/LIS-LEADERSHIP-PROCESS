import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [isAuthenticated, loading]);

  if (loading || !isAuthenticated) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#CC2229",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="organigrama"
        options={{
          title: "Organigrama",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="account-tree" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kpis"
        options={{
          title: "KPIs",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dofa"
        options={{
          title: "DOFA",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="interacciones"
        options={{
          title: "Interacciones",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="swap-horiz" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exportar"
        options={{
          title: "Exportar",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="download" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
