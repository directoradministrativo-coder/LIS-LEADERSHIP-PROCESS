import { Tabs, router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Modal,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, createContext, useContext } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { Storage } from "@/lib/storage";
import { ProfileStore } from "@/lib/profile-store";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const PROFILE_KEY = "lis_active_profile";
const ROLE_KEY = "lis_user_role";

// ─── LIS Role Context ─────────────────────────────────────────────────────────
// "effectiveRole" is what the user is NAVIGATING AS (may differ from DB role for superadmin).
// "dbRole" is the actual DB role (used for hamburger menu visibility).
type LisRole = "user" | "admin" | "superadmin" | null;

interface LisRoleContextValue {
  effectiveRole: LisRole;   // role used for UI/permissions (profile selected)
  dbRole: LisRole;          // actual DB role
}

const LisRoleContext = createContext<LisRoleContextValue>({ effectiveRole: null, dbRole: null });

/** Returns the EFFECTIVE role (what the user is navigating as). */
export function useLisRole(): LisRole {
  return useContext(LisRoleContext).effectiveRole;
}

/** Returns the DB role (used to decide if hamburger menu is shown). */
export function useDbRole(): LisRole {
  return useContext(LisRoleContext).dbRole;
}

// ─── Tab definitions (only non-admin tabs shown in bottom bar) ────────────────
const TAB_DEFS: {
  name: string;
  title: string;
  icon: string;
}[] = [
  { name: "index",              title: "Inicio",        icon: "home" },
  { name: "organigrama",        title: "Organigrama",   icon: "account-tree" },
  { name: "organigrama-visual", title: "Vista Org.",    icon: "hub" },
  { name: "kpis",               title: "KPIs",          icon: "bar-chart" },
  { name: "dofa",               title: "DOFA",          icon: "search" },
  { name: "interacciones",      title: "Interacciones", icon: "swap-horiz" },
  { name: "proyectos",          title: "Proyectos",     icon: "rocket-launch" },
  { name: "admin-progreso",     title: "Progreso",      icon: "leaderboard" },
  // Admin-only screens — NOT in tab bar, accessible via hamburger menu
  { name: "exportar",           title: "Exportar",      icon: "download" },
  { name: "admin-usuarios",     title: "Usuarios",      icon: "manage-accounts" },
  { name: "admin-proyectos",    title: "Proy. Admin",   icon: "assignment" },
  { name: "admin-historial",    title: "Historial",     icon: "history" },
];

// Tabs shown in bottom bar (never admin-only ones)
const BOTTOM_BAR_TABS = TAB_DEFS.slice(0, 8);

// Admin-only items for hamburger menu
const HAMBURGER_ITEMS = [
  { name: "exportar",        title: "Exportar Reportes",    icon: "download" },
  { name: "admin-usuarios",  title: "Gestión de Usuarios",  icon: "manage-accounts" },
  { name: "admin-proyectos", title: "Proyectos Admin",      icon: "assignment" },
  { name: "admin-historial", title: "Historial de Cambios", icon: "history" },
];

// ─── Hamburger Menu ───────────────────────────────────────────────────────────
function HamburgerMenu({
  navigation,
  state,
}: {
  navigation: any;
  state: any;
}) {
  const [open, setOpen] = useState(false);

  const routeMap: Record<string, number> = {};
  state.routes.forEach((r: any, i: number) => { routeMap[r.name] = i; });

  const navigate = (name: string) => {
    setOpen(false);
    navigation.navigate(name);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.hamburgerBtn}
        hitSlop={8}
      >
        <MaterialIcons name="menu" size={26} color="#CC2229" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setOpen(false)}>
          <View style={styles.menuPanel}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderTitle}>Menú Admin</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            {/* Items */}
            {HAMBURGER_ITEMS.map((item) => {
              const routeIndex = routeMap[item.name];
              const isFocused = routeIndex !== undefined && state.index === routeIndex;
              return (
                <Pressable
                  key={item.name}
                  style={[styles.menuItem, isFocused && styles.menuItemActive]}
                  onPress={() => navigate(item.name)}
                >
                  <View style={[styles.menuItemIcon, isFocused && styles.menuItemIconActive]}>
                    <MaterialIcons
                      name={item.icon as any}
                      size={22}
                      color={isFocused ? "#FFFFFF" : "#CC2229"}
                    />
                  </View>
                  <Text style={[styles.menuItemText, isFocused && styles.menuItemTextActive]}>
                    {item.title}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={isFocused ? "#FFFFFF" : "#9CA3AF"}
                  />
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({
  state,
  navigation,
  effectiveRole,
  dbRole,
  bottomPadding,
  tabBarHeight,
}: BottomTabBarProps & {
  effectiveRole: LisRole;
  dbRole: LisRole;
  bottomPadding: number;
  tabBarHeight: number;
}) {
  const isAdmin = dbRole === "admin" || dbRole === "superadmin";

  const routeMap: Record<string, number> = {};
  state.routes.forEach((r, i) => { routeMap[r.name] = i; });

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
        alignItems: "center",
      }}
    >
      {/* Bottom bar tabs — always the same 8 tabs for all roles */}
      {BOTTOM_BAR_TABS.map((tab) => {
        const routeIndex = routeMap[tab.name];
        if (routeIndex === undefined) return null;
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

      {/* Hamburger menu button — only for admin/superadmin DB role */}
      {isAdmin && (
        <View style={{ width: 44, alignItems: "center", justifyContent: "center" }}>
          <HamburgerMenu navigation={navigation} state={state} />
        </View>
      )}
    </View>
  );
}

// ─── Role Resolver ────────────────────────────────────────────────────────────
function RoleResolver({
  onResolved,
}: {
  onResolved: (effectiveRole: LisRole, dbRole: LisRole) => void;
}) {
  const { user, isAuthenticated, loading, logout } = useAuth();

  const checkAuth = trpc.auth2.checkAuthorization.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
    retry: false,
  });

  const [unauthorized, setUnauthorized] = useState(false);

  const handleUnauthorizedBack = async () => {
    try { await logout(); } catch { /* ignore */ }
    await Storage.removeItem(PROFILE_KEY);
    await Storage.removeItem(ROLE_KEY);
    onResolved(null, null);
    router.replace("/login" as any);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
      return;
    }
    if (checkAuth.isSuccess) {
      if (checkAuth.data?.authorized) {
        const dbRole = (checkAuth.data.role ?? "user") as LisRole;
        Storage.setItem(ROLE_KEY, dbRole ?? "user");

        if (dbRole === "superadmin") {
          // SuperAdmin: check which profile they selected
          Storage.getItem(PROFILE_KEY).then(savedProfile => {
            if (!savedProfile) {
              // No profile selected yet → go to profile selector
              router.replace("/select-profile" as any);
            } else {
              // Use the selected profile as effective role
              // "user" profile → effectiveRole = "user"
              // "admin" profile → effectiveRole = "superadmin" (full admin access)
              const effectiveRole: LisRole = savedProfile === "user" ? "user" : "superadmin";
              onResolved(effectiveRole, dbRole);
            }
          });
          return;
        }
        // Regular user or admin: effective role = DB role
        onResolved(dbRole, dbRole);
      } else {
        Storage.removeItem(ROLE_KEY);
        setUnauthorized(true);
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

  if (unauthorized) {
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

  return (
    <View style={styles.gateContainer}>
      <ActivityIndicator size="large" color="#CC2229" />
      <Text style={styles.gateLoadingText}>Cargando perfil...</Text>
    </View>
  );
}

// ─── Tab Layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const [roles, setRoles] = useState<{ effectiveRole: LisRole; dbRole: LisRole } | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [loading, isAuthenticated]);

  // When SuperAdmin returns from select-profile, reset roles to null so the
  // RoleResolver re-runs and reads the fresh PROFILE_KEY from Storage.
  // This is the most reliable approach: no race conditions, no event ordering issues.
  useEffect(() => {
    const unsubscribe = ProfileStore.subscribe(() => {
      // Reset roles → triggers RoleResolver → reads fresh PROFILE_KEY → calls onResolved
      setRoles(null);
    });
    return unsubscribe;
  }, []);

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

  if (roles === null) {
    return (
      <LisRoleContext.Provider value={{ effectiveRole: null, dbRole: null }}>
        <RoleResolver
          onResolved={(effectiveRole, dbRole) => setRoles({ effectiveRole, dbRole })}
        />
      </LisRoleContext.Provider>
    );
  }

  const { effectiveRole, dbRole } = roles;

  return (
    <LisRoleContext.Provider value={{ effectiveRole, dbRole }}>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            effectiveRole={effectiveRole}
            dbRole={dbRole}
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
  // Hamburger button
  hamburgerBtn: {
    padding: 4,
  },
  // Menu overlay
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 4,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 8,
  },
  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 14,
    backgroundColor: "#F9FAFB",
    marginBottom: 6,
  },
  menuItemActive: {
    backgroundColor: "#CC2229",
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemIconActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  menuItemTextActive: {
    color: "#FFFFFF",
  },
});
