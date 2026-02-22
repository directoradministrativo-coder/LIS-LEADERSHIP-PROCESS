/**
 * KeyboardModal
 *
 * A reusable modal wrapper that correctly handles the software keyboard on both
 * iOS and Android. On iOS we use `padding` behavior; on Android we use `height`.
 * The content is always wrapped in a ScrollView so the user can scroll to any
 * field that would otherwise be hidden behind the keyboard.
 *
 * Usage:
 * ```tsx
 * <KeyboardModal visible={showModal} onClose={() => setShowModal(false)} title="Agregar KPI">
 *   <TextInput ... />
 *   <TouchableOpacity onPress={handleSave}><Text>Guardar</Text></TouchableOpacity>
 * </KeyboardModal>
 * ```
 */
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

interface KeyboardModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Extra bottom padding inside the scroll area (default 24) */
  bottomPadding?: number;
}

export function KeyboardModal({
  visible,
  onClose,
  title,
  children,
  bottomPadding = 24,
}: KeyboardModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* KeyboardAvoidingView wraps the sheet so it rises above the keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Scrollable content — prevents keyboard from covering inputs */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kavContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
