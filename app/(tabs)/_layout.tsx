import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

// ─── Authorization Gate ───────────────────────────────────────────────────────

function AuthorizationGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "authorized" | "unauthorized">("checking");

  const checkAuth = trpc.auth2.checkAuthorization.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
    retry: false,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
      return;
    }
    if (checkAuth.isSuccess) {
      if (checkAuth.data?.authorized) {
        setAuthState("authorized");
      } else {
        setAuthState("unauthorized");
      }
    }
  }, [isAuthenticated, loading, checkAuth.isSuccess, checkAuth.data]);

  if (loading || checkAuth.isLoading) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.gateLoadingText}>Verificando acceso...</Text>
      </View>
    );
  }

  if (authState === "unauthorized") {
    return (
      <View style={styles.gateContainer}>
        <View style={styles.colorStrip}>
          {["#CC2229", "#F5A623", "#5CB85C", "#1B4F9B"].map(c => (
            <View key={c} style={[styles.colorBlock, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={styles.unauthorizedContent}>
          <View style={styles.unauthorizedIcon}>
            <MaterialIcons name="block" size={48} color="#CC2229" />
          </View>
          <Text style={styles.unauthorizedTitle}>Acceso No Autorizado</Text>
          <Text style={styles.unauthorizedMessage}>
            Tu cuenta <Text style={styles.unauthorizedEmail}>{(user as any)?.email}</Text> no está en la lista de usuarios autorizados para ingresar a esta aplicación.
          </Text>
          <Text style={styles.unauthorizedSubMessage}>
            Por favor contacta al administrador de LIS para solicitar acceso.
          </Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => router.replace("/login" as any)}
          >
            <MaterialIcons name="logout" size={18} color="#FFFFFF" />
            <Text style={styles.logoutBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Tab Layout ───────────────────────────────────────────────────────────────

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading, user } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const isAdmin = (user as any)?.role === "admin";

  if (loading || !isAuthenticated) return null;

  return (
    <AuthorizationGate>
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
          name="organigrama-visual"
          options={{
            title: "Vista Org.",
            tabBarIcon: ({ color, size }) => <MaterialIcons name="hub" size={size} color={color} />,
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
        {/* Admin-only tabs */}
        <Tabs.Screen
          name="admin-usuarios"
          options={{
            title: "Usuarios",
            tabBarIcon: ({ color, size }) => <MaterialIcons name="manage-accounts" size={size} color={color} />,
            href: isAdmin ? undefined : null,
          }}
        />
      </Tabs>
    </AuthorizationGate>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  colorStrip: {
    flexDirection: "row",
    height: 6,
  },
  colorBlock: {
    flex: 1,
  },
  gateLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  unauthorizedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  unauthorizedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FECACA",
  },
  unauthorizedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
  },
  unauthorizedMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  unauthorizedEmail: {
    fontWeight: "700",
    color: "#CC2229",
  },
  unauthorizedSubMessage: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CC2229",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
