import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

export default function LoginScreen() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const colors = useColors();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // Safety timeout: if loading takes more than 3 seconds, show the login screen anyway
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLoginError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await Api.loginWithPassword(trimmedEmail, trimmedPassword);

      if (result.user) {
        // Store user info for native platforms
        const userInfo: Auth.User = {
          id: result.user.id,
          openId: result.user.openId,
          name: result.user.name,
          email: result.user.email,
          loginMethod: "password",
          lastSignedIn: new Date(),
        };
        await Auth.setUserInfo(userInfo);

        // Store the session token for all platforms (web uses localStorage, native uses SecureStore)
        if (result.sessionToken) {
          await Auth.setSessionToken(result.sessionToken);
        }

        // Refresh auth state and navigate
        await refresh();
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const message = err?.message ?? "Error al iniciar sesión. Verifica tus credenciales.";
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading && !timedOut) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#CC2229" />
      </View>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-white" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Login Form */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setLoginError(null); }}
                placeholder="usuario@lisleadership.com.co"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loginLoading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); setLoginError(null); }}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loginLoading}
              />
            </View>

            {/* Error message */}
            {loginError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Ingresar al Sistema</Text>
              )}
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
            <TouchableOpacity onPress={() => Linking.openURL("https://www.lisleadership.com.co")}>
              <Text style={styles.footerLink}>www.lisleadership.com.co</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
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
    paddingTop: 32,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 220,
    height: 110,
  },
  titleSection: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 20,
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
    marginVertical: 14,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  formSection: {
    marginHorizontal: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 16,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#CC2229",
    paddingVertical: 15,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#CC2229",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  footerLink: {
    fontSize: 11,
    color: "#1B4F9B",
    textAlign: "center",
    paddingBottom: 12,
    textDecorationLine: "underline",
  },
});
