import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Linking } from "react-native";
import { useAppAlert } from "@/components/app-alert";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Storage } from "@/lib/storage";
import { useLisRole, useDbRole } from "./_layout";

const PROFILE_KEY = "lis_active_profile";

const MODULES = [
  { id: "organigrama", title: "Organigrama del Área", icon: "👥", description: "Estructura jerárquica del equipo", route: "/(tabs)/organigrama", color: "#1B4F9B" },
  { id: "kpis", title: "KPIs del Proceso", icon: "📊", description: "Indicadores clave de desempeño", route: "/(tabs)/kpis", color: "#CC2229" },
  { id: "dofa", title: "Análisis DOFA", icon: "🔍", description: "Debilidades, Oportunidades, Fortalezas, Amenazas", route: "/(tabs)/dofa", color: "#5CB85C" },
  { id: "proveedores", title: "Proveedores", icon: "📦", description: "Procesos que proveen al área", route: "/(tabs)/interacciones?type=proveedor", color: "#F5A623" },
  { id: "clientes", title: "Clientes", icon: "🤝", description: "Procesos que reciben del área", route: "/(tabs)/interacciones?type=cliente", color: "#6366F1" },
  { id: "proyectos", title: "Proyectos", icon: "🚀", description: "Proyectos del área priorizados por impacto", route: "/(tabs)/proyectos", color: "#7C3AED" },
];

function useCountdown(deadline: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!deadline) { setTimeLeft(null); setExpired(false); return; }
    const target = new Date(deadline);
    if (isNaN(target.getTime())) { setTimeLeft(null); return; }

    const calc = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    calc();
    timerRef.current = setInterval(calc, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [deadline]);

  return { timeLeft, expired };
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const [processName, setProcessName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [activeProfile, setActiveProfile] = useState<"user" | "admin">("user");

  // effectiveRole = what the user is navigating as (may be "user" for superadmin navigating as user)
  const lisRole = useLisRole();
  // dbRole = actual DB role (used for UI chrome: badge, profile switcher, hamburger)
  const dbRole = useDbRole();
  const isSuperAdmin = dbRole === "superadmin";
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";
  // Derive activeProfile from effectiveRole for real-time accuracy
  // (instead of reading from Storage which may lag)
  const activeProfileFromRole: "user" | "admin" = isAdmin ? "admin" : "user";

  useEffect(() => {
    Storage.getItem(PROFILE_KEY).then((p: string | null) => {
      if (p === "admin" || p === "user") setActiveProfile(p);
    });
  }, []);

  const handleLogout = async () => {
    // Clear saved profile and role so SuperAdmin sees the selector next time
    await Storage.removeItem(PROFILE_KEY);
    await Storage.removeItem("lis_user_role");
    await logout();
    // Force navigation to login after logout
    router.replace("/login" as any);
  };

  const processQuery = trpc.process.getOrCreate.useQuery(undefined, {
    retry: false,
  });

  const progressQuery = trpc.progress.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const progress = progressQuery.data;

  const deadlineQuery = trpc.config.getDeadline.useQuery(undefined, { retry: false });
  const { timeLeft, expired } = useCountdown(deadlineQuery.data?.deadline);

  // Map module id to progress status
  const moduleStatus: Record<string, boolean> = {
    organigrama: progress?.organigrama ?? false,
    kpis: progress?.kpis ?? false,
    dofa: progress?.dofa ?? false,
    proveedores: progress?.proveedores ?? false,
    clientes: progress?.clientes ?? false,
    proyectos: (progress as any)?.proyectos ?? false,
  };

  const updateProcess = trpc.process.update.useMutation({
    onSuccess: () => {
      processQuery.refetch();
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    if (processQuery.data?.processName) {
      setProcessName(processQuery.data.processName);
    }
  }, [processQuery.data]);

  const { alert } = useAppAlert();

  const handleSaveName = () => {
    if (!tempName.trim()) {
      alert({ title: "Error", message: "El nombre del proceso no puede estar vacío" });
      return;
    }
    updateProcess.mutate({ processName: tempName.trim() });
    setProcessName(tempName.trim());
  };

  const handleEditName = () => {
    setTempName(processName);
    setIsEditingName(true);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/lis-logo.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          {/* Settings button - visible only when navigating as admin (effectiveRole) */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push("/(tabs)/admin-usuarios" as any)}
            >
              <MaterialIcons name="manage-accounts" size={20} color="#1B4F9B" />
            </TouchableOpacity>
          )}
          {/* Profile switcher for SuperAdmin - uses effectiveRole for real-time badge */}
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.profileBadge, { backgroundColor: activeProfileFromRole === "admin" ? "#CC2229" : "#EEF2FF", borderColor: activeProfileFromRole === "admin" ? "#CC2229" : "#C7D2FE" }]}
              onPress={() => router.push("/select-profile" as any)}
            >
              <MaterialIcons
                name={activeProfileFromRole === "admin" ? "admin-panel-settings" : "person"}
                size={13}
                color={activeProfileFromRole === "admin" ? "#FFFFFF" : "#1B4F9B"}
              />
              <Text style={[styles.profileBadgeText, { color: activeProfileFromRole === "admin" ? "#FFFFFF" : "#1B4F9B" }]}>
                {activeProfileFromRole === "admin" ? "Admin" : "Usuario"}
              </Text>
            </TouchableOpacity>
          )}
          {/* Admin badge (non-superadmin admins) */}
          {isAdmin && !isSuperAdmin && (
            <View style={styles.adminBadge}>
              <MaterialIcons name="admin-panel-settings" size={13} color="#FFFFFF" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.userName}>{user?.name ?? "Líder de Área"}</Text>
          <View style={styles.redDivider} />
        </View>

        {/* Process Name Section */}
        <View style={styles.processSection}>
          <Text style={styles.sectionLabel}>NOMBRE DEL PROCESO</Text>
          {processQuery.isLoading ? (
            <ActivityIndicator color="#CC2229" style={{ marginVertical: 12 }} />
          ) : isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Ej: Dirección Comercial"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => setIsEditingName(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn]}
                  onPress={handleSaveName}
                  disabled={updateProcess.isPending}
                >
                  {updateProcess.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.processNameCard} onPress={handleEditName}>
              {processName ? (
                <Text style={styles.processNameText}>{processName}</Text>
              ) : (
                <Text style={styles.processNamePlaceholder}>Toca para ingresar el nombre del proceso...</Text>
              )}
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Countdown Timer */}
        {timeLeft && (
          <View style={[styles.countdownCard, expired && styles.countdownExpired]}>
            <Text style={styles.countdownLabel}>{expired ? "⏰ Plazo vencido" : "⏳ Tiempo restante para entregar"}</Text>
            {!expired ? (
              <View style={styles.countdownRow}>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{timeLeft.days}</Text>
                  <Text style={styles.countdownUnitLabel}>días</Text>
                </View>
                <Text style={styles.countdownSep}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{String(timeLeft.hours).padStart(2, "0")}</Text>
                  <Text style={styles.countdownUnitLabel}>horas</Text>
                </View>
                <Text style={styles.countdownSep}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{String(timeLeft.minutes).padStart(2, "0")}</Text>
                  <Text style={styles.countdownUnitLabel}>min</Text>
                </View>
                <Text style={styles.countdownSep}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{String(timeLeft.seconds).padStart(2, "0")}</Text>
                  <Text style={styles.countdownUnitLabel}>seg</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.countdownExpiredText}>El plazo de entrega ha vencido. Por favor contacta al administrador.</Text>
            )}
          </View>
        )}

        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionLabel}>PROGRESO DEL LEVANTAMIENTO</Text>
            <Text style={styles.progressCount}>
              {progress?.completedCount ?? 0} de {progress?.totalCount ?? 6} módulos
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(((progress?.completedCount ?? 0) / (progress?.totalCount ?? 6)) * 100)}%`,
                  backgroundColor:
                    (progress?.completedCount ?? 0) === 6
                      ? "#5CB85C"
                      : (progress?.completedCount ?? 0) >= 3
                      ? "#F5A623"
                      : "#CC2229",
                },
              ]}
            />
          </View>
          <Text style={styles.progressPercent}>
            {Math.round(((progress?.completedCount ?? 0) / (progress?.totalCount ?? 6)) * 100)}% completado
          </Text>
        </View>

        {/* Modules Grid */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionLabel}>MÓDULOS DEL LEVANTAMIENTO</Text>
          <View style={styles.modulesGrid}>
            {MODULES.map((module) => {
              const done = moduleStatus[module.id] ?? false;
              return (
                <TouchableOpacity
                  key={module.id}
                  style={[styles.moduleCard, { borderLeftColor: done ? "#5CB85C" : module.color }]}
                  onPress={() => router.push(module.route as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moduleIcon}>{module.icon}</Text>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleDescription}>{module.description}</Text>
                  </View>
                  <View style={styles.moduleStatusBadge}>
                    {done ? (
                      <View style={styles.badgeDone}>
                        <Text style={styles.badgeDoneText}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.badgePending}>
                        <Text style={styles.badgePendingText}>Pendiente</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.colorStrip}>
            <View style={[styles.colorBlock, { backgroundColor: "#CC2229" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#F5A623" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#5CB85C" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#1B4F9B" }]} />
          </View>
          <Text style={styles.footerText}>Logística Inteligente Solution © 2026</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.lisleadership.com.co')}>
            <Text style={styles.footerLink}>www.lisleadership.com.co</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerLogo: {
    width: 120,
    height: 50,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    backgroundColor: "#CC2229",
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CC2229",
  },
  logoutText: {
    color: "#CC2229",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 2,
  },
  redDivider: {
    width: 40,
    height: 3,
    backgroundColor: "#CC2229",
    borderRadius: 2,
    marginTop: 10,
  },
  processSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  processNameCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  processNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    flex: 1,
  },
  processNamePlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
    flex: 1,
    fontStyle: "italic",
  },
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  editNameContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#CC2229",
  },
  nameInput: {
    fontSize: 16,
    color: "#1A1A2E",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
  },
  saveBtn: {
    backgroundColor: "#CC2229",
  },
  cancelBtnText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  modulesSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  modulesGrid: {
    gap: 10,
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  moduleIcon: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: "center",
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  moduleDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  moduleArrow: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "300",
  },
  progressSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B4F9B",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
  },
  moduleStatusBadge: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeDoneText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "700",
  },
  badgePending: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#FEF9C3",
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  badgePendingText: {
    fontSize: 10,
    color: "#854D0E",
    fontWeight: "600",
  },
  countdownCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#1B4F9B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  countdownExpired: {
    backgroundColor: "#CC2229",
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countdownUnit: {
    alignItems: "center",
    minWidth: 52,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  countdownNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 30,
  },
  countdownUnitLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    marginTop: 2,
  },
  countdownSep: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
  },
  countdownExpiredText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    marginTop: 8,
    paddingBottom: 16,
  },
  colorStrip: {
    flexDirection: "row",
    height: 4,
    marginBottom: 8,
  },
  colorBlock: {
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerLink: {
    fontSize: 11,
    color: "#1B4F9B",
    textAlign: "center",
    paddingBottom: 10,
    textDecorationLine: "underline",
  },
});
