import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { MaterialIcons } from "@expo/vector-icons";
import { Storage } from "@/lib/storage";
import { ProfileStore } from "@/lib/profile-store";

const PROFILE_KEY = "lis_active_profile";

export default function SelectProfileScreen() {
  const { user } = useAuth();

  const selectProfile = async (profile: "user" | "admin") => {
    await Storage.setItem(PROFILE_KEY, profile);
    // Notify the TabLayout context via the store BEFORE navigating.
    // The TabLayout listener updates effectiveRole synchronously.
    // Then we navigate back — the modal closes and the already-mounted
    // TabLayout already has the correct effectiveRole.
    ProfileStore.set(profile);
    // Small delay to ensure the store listener fires before navigation
    await new Promise(resolve => setTimeout(resolve, 50));
    router.replace("/(tabs)" as any);
  };

  return (
    <ScreenContainer containerClassName="bg-white" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Color strip */}
        <View style={styles.colorStrip}>
          {["#CC2229", "#F5A623", "#5CB85C", "#1B4F9B"].map(c => (
            <View key={c} style={[styles.colorBlock, { backgroundColor: c }]} />
          ))}
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/lis-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingLabel}>Bienvenido,</Text>
          <Text style={styles.greetingName}>
            {(user as any)?.name ?? (user as any)?.email ?? "Usuario"}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.selectTitle}>¿Con qué perfil deseas ingresar?</Text>
          <Text style={styles.selectSubtitle}>
            Tu cuenta tiene acceso a múltiples perfiles. Selecciona el perfil con el que deseas trabajar en esta sesión.
          </Text>
        </View>

        {/* Profile Cards */}
        <View style={styles.cardsContainer}>
          {/* User Profile */}
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => selectProfile("user")}
            activeOpacity={0.85}
          >
            <View style={[styles.profileIconContainer, { backgroundColor: "#EEF2FF" }]}>
              <MaterialIcons name="person" size={40} color="#1B4F9B" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileTitle}>Líder de Área</Text>
              <Text style={styles.profileDescription}>
                Accede al formulario de levantamiento de tu proceso: organigrama, KPIs, DOFA, interacciones y exportación.
              </Text>
            </View>
            <View style={[styles.profileBadge, { backgroundColor: "#1B4F9B" }]}>
              <Text style={styles.profileBadgeText}>Usuario</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" style={styles.profileArrow} />
          </TouchableOpacity>

          {/* Admin Profile */}
          <TouchableOpacity
            style={[styles.profileCard, styles.profileCardAdmin]}
            onPress={() => selectProfile("admin")}
            activeOpacity={0.85}
          >
            <View style={[styles.profileIconContainer, { backgroundColor: "#FEF2F2" }]}>
              <MaterialIcons name="admin-panel-settings" size={40} color="#CC2229" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileTitle}>Administrador</Text>
              <Text style={styles.profileDescription}>
                Visualiza todos los procesos registrados, gestiona usuarios autorizados y descarga reportes consolidados.
              </Text>
            </View>
            <View style={[styles.profileBadge, { backgroundColor: "#CC2229" }]}>
              <Text style={styles.profileBadgeText}>Admin</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" style={styles.profileArrow} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.superAdminBadge}>
            <MaterialIcons name="verified" size={14} color="#F5A623" />
            <Text style={styles.superAdminText}>Cuenta SuperAdmin</Text>
          </View>
          <Text style={styles.footerNote}>
            Puedes cambiar de perfil cerrando sesión y volviendo a ingresar.
          </Text>
        </View>

        {/* Bottom color strip */}
        <View style={styles.colorStrip}>
          {["#CC2229", "#F5A623", "#5CB85C", "#1B4F9B"].map(c => (
            <View key={c} style={[styles.colorBlock, { backgroundColor: c }]} />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  colorStrip: {
    flexDirection: "row",
    height: 6,
  },
  colorBlock: {
    flex: 1,
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 8,
  },
  logo: {
    width: 180,
    height: 90,
  },
  greetingSection: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  greetingLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 8,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: "#CC2229",
    borderRadius: 2,
    marginVertical: 16,
  },
  selectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 8,
  },
  selectSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  profileCardAdmin: {
    borderColor: "#FECACA",
  },
  profileIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
    paddingRight: 32,
  },
  profileTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  profileDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  profileBadge: {
    position: "absolute",
    top: 16,
    right: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  profileBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileArrow: {
    position: "absolute",
    right: 16,
    top: "50%",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 8,
  },
  superAdminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 6,
  },
  superAdminText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  footerNote: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
