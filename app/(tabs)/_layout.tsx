import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, createContext, useContext } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { Storage } from "@/lib/storage";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const PROFILE_KEY = "lis_active_profile";
const ROLE_KEY = "lis_user_role";

// ─── LIS Role Context ─────────────────────────────────────────────────────────
type LisRole = "user" | "admin" | "superadmin" | null;

const LisRoleContext = createContext<LisRole>(null);
export function useLisRole() { return useContext(LisRoleContext); }

// ─── Tab definitions ──────────────────────────────────────────────────────────
// adminOnly: true → hidden for "user" role
const TAB_DEFS: {
  name: string;
  title: string;
  icon: string;
  adminOnly?: boolean;
}[] = [
  { name: "index",            title: "Inicio",       icon: "home" },
  { name: "organigrama",      title: "Organigrama",  icon: "account-tree" },
  { name: "organigrama-visual", title: "Vista Org.", icon: "hub" },
  { name: "kpis",             title: "KPIs",         icon: "bar-chart" },
  { name: "dofa",             title: "DOFA",         icon: "search" },
  { name: "interacciones",    title: "Interacciones",icon: "swap-horiz" },
  { name: "proyectos",        title: "Proyectos",    icon: "rocket-launch" },
  { name: "admin-progreso",   title: "Progreso",     icon: "leaderboard" },
  { name: "exportar",         title: "Exportar",     icon: "download",          adminOnly: true },
  { name: "admin-usuarios",   title: "Usuarios",     icon: "manage-accounts",   adminOnly: true },
  { name: "admin-proyectos",  title: "Proy. Admin",  icon: "assignment",        adminOnly: true },
  { name: "admin-historial",  title: "Historial",    icon: "history",           adminOnly: true },
];

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
// Renders only the tabs that the current role is allowed to see.
// This is fully reactive: whenever lisRole changes, the bar re-renders.
function CustomTabBar({
  state,
  navigation,
  lisRole,
  bottomPadding,
  tabBarHeight,
}: BottomTabBarProps & { lisRole: LisRole; bottomPadding: number; tabBarHeight: number }) {
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  // Build a map of route name → index in state.routes
  const routeMap = Object.fromEntries(state.routes.map((r, i) => [r.name, i]));

  const visibleTabs = TAB_DEFS.filter((t) => {
    if (t.adminOnly && !isAdmin) return false;
    return routeMap[t.name] !== undefined;
  });

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 0.5,
        borderTopColor: "#E5E7EB",
        paddingTop: 6,
        paddingBottom: bottomPadding,
        height: tabBarHeight,
      }}
    >
      {visibleTabs.map((tab) => {
        const routeIndex = routeMap[tab.name];
        const isFocused = state.index === routeIndex;
        const color = isFocused ? "#CC2229" : "#9CA3AF";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: state.routes[routeIndex].key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name={tab.icon as any} size={22} color={color} />
            <Text
              style={{
                fontSize: 9,
                fontWeight: "600",
                color,
                marginTop: 2,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
        Storage.setItem(ROLE_KEY, lisRole ?? "user");
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

  const [lisRole, setLisRole] = useState<LisRole>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [loading, isAuthenticated]);

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

  // Don't render Tabs until role is resolved so the custom tab bar
  // has the correct role from the very first render.
  if (lisRole === null) {
    return (
      <LisRoleContext.Provider value={lisRole}>
        <AuthorizationGate onRoleResolved={setLisRole}>
          <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#CC2229" />
            <Text style={{ marginTop: 12, fontSize: 14, color: "#6B7280" }}>Cargando perfil...</Text>
          </View>
        </AuthorizationGate>
      </LisRoleContext.Provider>
    );
  }

  return (
    <LisRoleContext.Provider value={lisRole}>
      <AuthorizationGate onRoleResolved={setLisRole}>
        <Tabs
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              lisRole={lisRole}
              bottomPadding={bottomPadding}
              tabBarHeight={tabBarHeight}
            />
          )}
          screenOptions={{
            headerShown: false,
          }}
        >
          {TAB_DEFS.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name={tab.icon as any} size={size} color={color} />
                ),
              }}
            />
          ))}
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
