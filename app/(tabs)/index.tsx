import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Storage } from "@/lib/storage";

const PROFILE_KEY = "lis_active_profile";

const MODULES = [
  { id: "organigrama", title: "Organigrama del Área", icon: "👥", description: "Estructura jerárquica del equipo", route: "/(tabs)/organigrama", color: "#1B4F9B" },
  { id: "kpis", title: "KPIs del Proceso", icon: "📊", description: "Indicadores clave de desempeño", route: "/(tabs)/kpis", color: "#CC2229" },
  { id: "dofa", title: "Análisis DOFA", icon: "🔍", description: "Debilidades, Oportunidades, Fortalezas, Amenazas", route: "/(tabs)/dofa", color: "#5CB85C" },
  { id: "proveedores", title: "Proveedores", icon: "📦", description: "Procesos que proveen al área", route: "/(tabs)/interacciones?type=proveedor", color: "#F5A623" },
  { id: "clientes", title: "Clientes", icon: "🤝", description: "Procesos que reciben del área", route: "/(tabs)/interacciones?type=cliente", color: "#6366F1" },
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const [processName, setProcessName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [activeProfile, setActiveProfile] = useState<"user" | "admin">("user");

  const userRole = (user as any)?.role as string | undefined;
  const isSuperAdmin = userRole === "superadmin";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  useEffect(() => {
    Storage.getItem(PROFILE_KEY).then((p: string | null) => {
      if (p === "admin" || p === "user") setActiveProfile(p);
    });
  }, []);

  const handleLogout = async () => {
    // Clear saved profile so SuperAdmin sees the selector next time
    await Storage.removeItem(PROFILE_KEY);
    logout();
  };

  const processQuery = trpc.process.getOrCreate.useQuery(undefined, {
    retry: false,
  });

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

  const handleSaveName = () => {
    if (!tempName.trim()) {
      Alert.alert("Error", "El nombre del proceso no puede estar vacío");
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
          {/* Settings button - visible for admin and superadmin */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push("/(tabs)/admin-usuarios" as any)}
            >
              <MaterialIcons name="manage-accounts" size={22} color="#1B4F9B" />
            </TouchableOpacity>
          )}
          {/* Profile switcher for SuperAdmin */}
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.profileBadge, { backgroundColor: activeProfile === "admin" ? "#FEF2F2" : "#EEF2FF" }]}
              onPress={() => router.push("/select-profile" as any)}
            >
              <MaterialIcons
                name={activeProfile === "admin" ? "admin-panel-settings" : "person"}
                size={14}
                color={activeProfile === "admin" ? "#CC2229" : "#1B4F9B"}
              />
              <Text style={[styles.profileBadgeText, { color: activeProfile === "admin" ? "#CC2229" : "#1B4F9B" }]}>
                {activeProfile === "admin" ? "Admin" : "Usuario"}
              </Text>
            </TouchableOpacity>
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

        {/* Modules Grid */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionLabel}>MÓDULOS DEL LEVANTAMIENTO</Text>
          <View style={styles.modulesGrid}>
            {MODULES.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={[styles.moduleCard, { borderLeftColor: module.color }]}
                onPress={() => router.push(module.route as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.moduleIcon}>{module.icon}</Text>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                </View>
                <Text style={styles.moduleArrow}>›</Text>
              </TouchableOpacity>
            ))}
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
  },
});
