import React, { createContext, useCallback, useContext, useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

// ─── Types ──────────────────────────────────────────────────────────────────────

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type AlertOptions = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

type ToastOptions = {
  type: "success" | "error" | "info";
  message: string;
  duration?: number; // ms, default 3500
};

type AppAlertContextType = {
  alert: (options: AlertOptions) => void;
  toast: (options: ToastOptions) => void;
};

const AppAlertContext = createContext<AppAlertContextType>({
  alert: () => {},
  toast: () => {},
});

export function useAppAlert() {
  return useContext(AppAlertContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────────

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const [loadingBtn, setLoadingBtn] = useState<number | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastOptions, setToastOptions] = useState<ToastOptions | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
    setLoadingBtn(null);
    setAlertVisible(true);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastOptions(options);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setToastOptions(null);
    }, options.duration ?? 3500);
  }, []);

  const handleButtonPress = useCallback(async (btn: AlertButton, idx: number) => {
    if (btn.onPress) {
      setLoadingBtn(idx);
      try {
        await btn.onPress();
      } catch {}
      setLoadingBtn(null);
    }
    setAlertVisible(false);
    setAlertOptions(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setAlertVisible(false);
    setAlertOptions(null);
    setLoadingBtn(null);
  }, []);

  // If no buttons provided, add a default "OK"
  const buttons = alertOptions?.buttons?.length
    ? alertOptions.buttons
    : [{ text: "Aceptar", style: "default" as const }];

  const toastColors = {
    success: { bg: "#22C55E18", border: "#22C55E", text: "#22C55E", icon: "✓" },
    error: { bg: "#EF444418", border: "#EF4444", text: "#EF4444", icon: "✗" },
    info: { bg: "#3B82F618", border: "#3B82F6", text: "#3B82F6", icon: "ℹ" },
  };

  return (
    <AppAlertContext.Provider value={{ alert, toast }}>
      {children}

      {/* Alert Modal */}
      <Modal
        visible={alertVisible}
        animationType="fade"
        transparent
        onRequestClose={handleDismiss}
      >
        <View style={s.overlay}>
          <View style={[s.container, { backgroundColor: colors.surface }]}>
            {alertOptions?.title ? (
              <Text style={[s.title, { color: colors.foreground }]}>
                {alertOptions.title}
              </Text>
            ) : null}
            {alertOptions?.message ? (
              <Text style={[s.message, { color: colors.muted }]}>
                {alertOptions.message}
              </Text>
            ) : null}
            <View style={s.btnRow}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.btn,
                      isCancel && [s.btnCancel, { borderColor: colors.border }],
                      isDestructive && s.btnDestructive,
                      !isCancel && !isDestructive && s.btnDefault,
                      loadingBtn === idx && { opacity: 0.6 },
                    ]}
                    onPress={() => handleButtonPress(btn, idx)}
                    disabled={loadingBtn !== null}
                  >
                    {loadingBtn === idx ? (
                      <ActivityIndicator color={isCancel ? colors.foreground : "#fff"} size="small" />
                    ) : (
                      <Text
                        style={[
                          s.btnText,
                          isCancel && { color: colors.foreground },
                          isDestructive && { color: "#fff" },
                          !isCancel && !isDestructive && { color: "#fff" },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toastVisible && toastOptions && (
        <View
          style={[
            s.toast,
            {
              backgroundColor: toastColors[toastOptions.type].bg,
              borderLeftColor: toastColors[toastOptions.type].border,
            },
          ]}
          pointerEvents="box-none"
        >
          <Text style={[s.toastText, { color: toastColors[toastOptions.type].text }]}>
            {toastColors[toastOptions.type].icon} {toastOptions.message}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setToastVisible(false);
              if (toastTimer.current) clearTimeout(toastTimer.current);
            }}
            style={{ padding: 4 }}
          >
            <Text style={{ color: toastColors[toastOptions.type].text, fontWeight: "700" }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </AppAlertContext.Provider>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  btnCancel: {
    borderWidth: 1,
  },
  btnDestructive: {
    backgroundColor: "#EF4444",
  },
  btnDefault: {
    backgroundColor: "#1B4F9B",
  },
  btnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  toast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 10,
  },
  toastText: {
    flex: 1,
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
  },
});
