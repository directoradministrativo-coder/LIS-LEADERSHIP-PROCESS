import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, createContext, useContext } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { Storage } from "@/lib/storage";

const PROFILE_KEY = "lis_active_profile";
const ROLE_KEY = "lis_user_role";

// ─── LIS Role Context ─────────────────────────────────────────────────────────
// Shares the verified LIS role (from DB) across the entire tab tree

type LisRole = "user" | "admin" | "superadmin" | null;

const LisRoleContext = createContext<LisRole>(null);
export function useLisRole() { return useContext(LisRoleContext); }

// ─── Authorization Gate ───────────────────────────────────────────────────────

function AuthorizationGate({
  children,
  onRoleResolved,
}: {
  children: React.ReactNode;
  onRoleResolved: (role: LisRole) => void;
}) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "authorized" | "unauthorized">("checking");

  const handleUnauthorizedBack = async () => {
    try { await logout(); } catch { /* ignore */ }
    await Storage.removeItem(PROFILE_KEY);
    await Storage.removeItem(ROLE_KEY);
    onRoleResolved(null);
    router.replace("/login" as any);
  };

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
        const lisRole = (checkAuth.data.role ?? "user") as LisRole;
        // Persist role for logout cleanup
        Storage.setItem(ROLE_KEY, lisRole ?? "user");
        // Notify TabLayout of the resolved role immediately
        onRoleResolved(lisRole);

        if (lisRole === "superadmin") {
          Storage.getItem(PROFILE_KEY).then(savedProfile => {
            if (!savedProfile) {
              router.replace("/select-profile" as any);
            } else {
              setAuthState("authorized");
            }
          });
          return;
        }
        setAuthState("authorized");
      } else {
        Storage.removeItem(ROLE_KEY);
        onRoleResolved(null);
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
            Tu cuenta{" "}
            <Text style={styles.unauthorizedEmail}>{(user as any)?.email}</Text>{" "}
            no está en la lista de usuarios autorizados para ingresar a esta aplicación.
          </Text>
          <Text style={styles.unauthorizedSubMessage}>
            Por favor contacta al administrador de LIS para solicitar acceso.
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleUnauthorizedBack}>
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
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  // lisRole is set synchronously when AuthorizationGate resolves the role
  const [lisRole, setLisRole] = useState<LisRole>(null);
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  // Redirect to login as soon as we know user is not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [loading, isAuthenticated]);

  // Show loading spinner while checking auth state
  if (loading || (!isAuthenticated && !loading)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <View style={{ flexDirection: "row", height: 6, width: "100%", position: "absolute", top: 0 }}>
          {["#CC2229", "#F5A623", "#5CB85C", "#1B4F9B"].map(c => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={{ marginTop: 12, fontSize: 14, color: "#6B7280" }}>
          {loading ? "Cargando..." : "Redirigiendo al inicio de sesión..."}
        </Text>
      </View>
    );
  }

  return (
    <LisRoleContext.Provider value={lisRole}>
      <AuthorizationGate onRoleResolved={setLisRole}>
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
          <Tabs.Screen
            name="proyectos"
            options={{
              title: "Proyectos",
              tabBarIcon: ({ color, size }) => <MaterialIcons name="rocket-launch" size={size} color={color} />,
            }}
          />
          {/* Admin-only tabs: visible only for admin and superadmin roles */}
          <Tabs.Screen
            name="admin-usuarios"
            options={{
              title: "Usuarios",
              tabBarIcon: ({ color, size }) => <MaterialIcons name="manage-accounts" size={size} color={color} />,
              href: isAdmin ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="admin-proyectos"
            options={{
              title: "Proy. Admin",
              tabBarIcon: ({ color, size }) => <MaterialIcons name="assignment" size={size} color={color} />,
              href: isAdmin ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="admin-progreso"
            options={{
              title: "Progreso",
              tabBarIcon: ({ color, size }) => <MaterialIcons name="leaderboard" size={size} color={color} />,
              href: isAdmin ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="admin-historial"
            options={{
              title: "Historial",
              tabBarIcon: ({ color, size }) => <MaterialIcons name="history" size={size} color={color} />,
              href: isAdmin ? undefined : null,
            }}
          />
        </Tabs>
      </AuthorizationGate>
    </LisRoleContext.Provider>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  colorStrip: {
    flexDirection: "row",
    height: 6,
    width: "100%",
    position: "absolute",
    top: 0,
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
