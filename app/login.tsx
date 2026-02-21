import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import { useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const colors = useColors();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#CC2229" />
      </View>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-white" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with LIS brand colors */}
        <View style={styles.header}>
          <View style={styles.colorStrip}>
            <View style={[styles.colorBlock, { backgroundColor: "#CC2229" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#F5A623" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#5CB85C" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#1B4F9B" }]} />
          </View>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/lis-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.appTitle}>Levantamiento de Procesos</Text>
          <Text style={styles.appSubtitle}>Sistema Corporativo LIS 2026</Text>
          <View style={styles.divider} />
          <Text style={styles.description}>
            Plataforma para el levantamiento del estado actual de los procesos de Logística Inteligente Solution.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <FeatureItem icon="📊" text="Organigrama del Área" />
          <FeatureItem icon="📈" text="KPIs del Proceso" />
          <FeatureItem icon="🔍" text="Análisis DOFA" />
          <FeatureItem icon="🔗" text="Proveedores y Clientes" />
          <FeatureItem icon="📥" text="Exportación a Excel" />
        </View>

        {/* Login Button */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={startOAuthLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>Ingresar al Sistema</Text>
          </TouchableOpacity>
          <Text style={styles.loginNote}>
            Acceso exclusivo para líderes de área de LIS
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.colorStrip}>
            <View style={[styles.colorBlock, { backgroundColor: "#CC2229" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#F5A623" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#5CB85C" }]} />
            <View style={[styles.colorBlock, { backgroundColor: "#1B4F9B" }]} />
          </View>
          <Text style={styles.footerText}>© 2026 Logística Inteligente Solution</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    width: "100%",
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
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 220,
    height: 110,
  },
  titleSection: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CC2229",
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: "#CC2229",
    borderRadius: 2,
    marginVertical: 16,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
  featuresSection: {
    marginHorizontal: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 28,
    textAlign: "center",
  },
  featureText: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "500",
  },
  loginSection: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: "#CC2229",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#CC2229",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginNote: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 0,
  },
  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 12,
  },
});
