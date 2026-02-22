import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, FlatList, Platform
} from "react-native";
import { KeyboardModal } from "@/components/keyboard-modal";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";

type Role = "user" | "admin" | "superadmin";

type UserForm = {
  email: string;
  name: string;
  areaName: string;
  role: Role;
};

const EMPTY_FORM: UserForm = { email: "", name: "", areaName: "", role: "user" };

// ─── CSV Import Helper ────────────────────────────────────────────────────────

function parseCSV(text: string): Array<{ email: string; name: string; areaName: string; role: Role }> {
  const lines = text.trim().split("\n");
  const results: Array<{ email: string; name: string; areaName: string; role: Role }> = [];
  // Skip header if present
  const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length >= 2 && cols[0] && cols[1]) {
      const rawRole = cols[3]?.toLowerCase();
      const role: Role = rawRole === "admin" ? "admin" : rawRole === "superadmin" ? "superadmin" : "user";
      results.push({
        email: cols[0],
        name: cols[1],
        areaName: cols[2] ?? "",
        role,
      });
    }
  }
  return results;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminUsuariosScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [csvText, setCsvText] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const usersQuery = trpc.admin.listAuthorizedUsers.useQuery();

  const createUser = trpc.admin.createAuthorizedUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setFormErrors([]);
    },
    onError: (err) => {
      Alert.alert("Error", err.message.includes("Duplicate") ? "Este email ya está registrado." : err.message);
    },
  });

  const deleteUser = trpc.admin.deleteAuthorizedUser.useMutation({
    onSuccess: () => usersQuery.refetch(),
  });

  const updateUser = trpc.admin.updateAuthorizedUser.useMutation({
    onSuccess: () => usersQuery.refetch(),
  });

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!form.email.trim()) errors.push("• Email es obligatorio");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push("• Email no tiene formato válido");
    if (!form.name.trim()) errors.push("• Nombre es obligatorio");
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    createUser.mutate({
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      areaName: form.areaName.trim() || undefined,
      role: form.role,
    });
  };

  const handleImportCSV = async () => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      Alert.alert("Error", "No se encontraron filas válidas en el CSV.\n\nFormato esperado:\nemail,nombre,area,rol");
      return;
    }
    setImporting(true);
    let success = 0;
    let errors = 0;
    for (const row of rows) {
      try {
        await createUser.mutateAsync(row);
        success++;
      } catch {
        errors++;
      }
    }
    setImporting(false);
    setShowImportModal(false);
    setCsvText("");
    usersQuery.refetch();
    Alert.alert("Importación completada", `✅ ${success} usuarios importados\n${errors > 0 ? `⚠️ ${errors} errores (emails duplicados)` : ""}`);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      "Eliminar usuario",
      `¿Deseas eliminar a "${name}" de la lista autorizada?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteUser.mutate({ id }) },
      ]
    );
  };

  const ROLE_LABELS: Record<Role, string> = {
    user: "Usuario",
    admin: "Administrador",
    superadmin: "SuperAdmin",
  };

  const ROLE_COLORS: Record<Role, string> = {
    user: "#1B4F9B",
    admin: "#CC2229",
    superadmin: "#92400E",
  };

  const toggleRole = (id: number, currentRole: Role) => {
    const roles: Role[] = ["user", "admin", "superadmin"];
    const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];
    Alert.alert(
      "Cambiar rol",
      `¿Cambiar a ${ROLE_LABELS[nextRole]}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => updateUser.mutate({ id, role: nextRole }) },
      ]
    );
  };

  const users = usersQuery.data ?? [];

  return (
    <ScreenContainer containerClassName="bg-white">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.colorStrip}>
          {["#CC2229", "#F5A623", "#5CB85C", "#1B4F9B"].map(c => (
            <View key={c} style={[styles.colorBlock, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={styles.headerContent}>
          <MaterialIcons name="manage-accounts" size={24} color="#CC2229" />
          <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={12} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Lista cerrada de usuarios autorizados para ingresar a la app
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Agregar usuario</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importBtn} onPress={() => setShowImportModal(true)}>
          <MaterialIcons name="upload-file" size={18} color="#1B4F9B" />
          <Text style={styles.importBtnText}>Importar CSV</Text>
        </TouchableOpacity>
      </View>

      {/* CSV Format hint */}
      <View style={styles.csvHint}>
        <MaterialIcons name="info-outline" size={14} color="#6B7280" />
        <Text style={styles.csvHintText}>
          Formato CSV: email, nombre, área, rol (user/admin/superadmin)
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#5CB85C" }]}>
            {users.filter(u => u.isEnrolled).length}
          </Text>
          <Text style={styles.statLabel}>Enrolados</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#CC2229" }]}>
            {users.filter(u => u.role === "admin" || u.role === "superadmin").length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#F5A623" }]}>
            {users.filter(u => !u.isEnrolled).length}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>

      {/* Users List */}
      {usersQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CC2229" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="group-off" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>Sin usuarios registrados</Text>
          <Text style={styles.emptyStateText}>
            Agrega usuarios manualmente o importa un archivo CSV.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <TouchableOpacity
                    style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[(item.role as Role) ?? "user"] }]}
                    onPress={() => toggleRole(item.id, item.role as Role)}
                  >
                    <Text style={styles.roleBadgeText}>
                      {ROLE_LABELS[(item.role as Role) ?? "user"]}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.userEmail}>{item.email}</Text>
                {item.areaName && (
                  <Text style={styles.userArea}>📍 {item.areaName}</Text>
                )}
                <View style={styles.enrolledRow}>
                  <View style={[styles.enrolledDot, { backgroundColor: item.isEnrolled ? "#5CB85C" : "#F5A623" }]} />
                  <Text style={styles.enrolledText}>
                    {item.isEnrolled ? "Enrolado" : "Pendiente de enrolamiento"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, item.name)}
              >
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add User Modal */}
      <KeyboardModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setFormErrors([]); setForm(EMPTY_FORM); }}
        title="Agregar Usuario"
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {formErrors.length > 0 && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color="#CC2229" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Campos obligatorios incompletos:</Text>
                {formErrors.map((e, i) => <Text key={i} style={styles.errorItem}>{e}</Text>)}
              </View>
            </View>
          )}
          <Text style={styles.fieldLabel}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, formErrors.some(e => e.includes("Email")) && styles.inputError]} value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="usuario@lis.com.co" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          <Text style={styles.fieldLabel}>Nombre completo <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, formErrors.some(e => e.includes("Nombre")) && styles.inputError]} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Nombre del líder de área" placeholderTextColor="#9CA3AF" />
          <Text style={styles.fieldLabel}>Área</Text>
          <TextInput style={styles.input} value={form.areaName} onChangeText={v => setForm(p => ({ ...p, areaName: v }))} placeholder="Ej: Logística, Operaciones..." placeholderTextColor="#9CA3AF" />
          <Text style={styles.fieldLabel}>Rol</Text>
          <View style={styles.roleSelector}>
            {(["user", "admin", "superadmin"] as Role[]).map(r => (
              <TouchableOpacity key={r} style={[styles.roleOption, form.role === r && { backgroundColor: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] }]} onPress={() => setForm(p => ({ ...p, role: r }))}>
                <MaterialIcons name={r === "superadmin" ? "verified" : r === "admin" ? "admin-panel-settings" : "person"} size={16} color={form.role === r ? "#FFFFFF" : "#6B7280"} />
                <Text style={[styles.roleOptionText, form.role === r && styles.roleOptionTextActive]}>{r === "superadmin" ? "SuperAdmin" : r === "admin" ? "Admin" : "Usuario"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveBtn, createUser.isPending && styles.saveBtnDisabled]} onPress={handleSave} disabled={createUser.isPending}>
            {createUser.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Guardar Usuario</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardModal>

      {/* Import CSV Modal */}
      <KeyboardModal
        visible={showImportModal}
        onClose={() => { setShowImportModal(false); setCsvText(""); }}
        title="Importar desde CSV"
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={styles.csvFormatBox}>
            <Text style={styles.csvFormatTitle}>📋 Formato del CSV:</Text>
            <Text style={styles.csvFormatCode}>{"email,nombre,area,rol\njuan@lis.com.co,Juan Pérez,Logística,user\nadmin@lis.com.co,Ana García,Dirección,admin"}</Text>
          </View>
          <Text style={styles.fieldLabel}>Pega el contenido del CSV aquí:</Text>
          <TextInput style={styles.csvInput} value={csvText} onChangeText={setCsvText} placeholder={"email,nombre,area,rol\n..."} multiline numberOfLines={8} placeholderTextColor="#9CA3AF" textAlignVertical="top" />
          {csvText.length > 0 && <Text style={styles.csvPreview}>{parseCSV(csvText).length} filas detectadas</Text>}
          <TouchableOpacity style={[styles.saveBtn, (importing || !csvText.trim()) && styles.saveBtnDisabled]} onPress={handleImportCSV} disabled={importing || !csvText.trim()}>
            {importing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Importar usuarios</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  colorStrip: { flexDirection: "row", height: 4 },
  colorBlock: { flex: 1 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    flex: 1,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CC2229",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  adminBadgeText: { fontSize: 10, color: "#FFFFFF", fontWeight: "700" },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CC2229",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  importBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1B4F9B",
    gap: 6,
  },
  importBtnText: { color: "#1B4F9B", fontWeight: "700", fontSize: 14 },
  csvHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 6,
  },
  csvHintText: { fontSize: 11, color: "#6B7280" },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyStateTitle: { fontSize: 18, fontWeight: "700", color: "#374151", textAlign: "center" },
  emptyStateText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  listContent: { padding: 16, gap: 10 },
  userCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B4F9B",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  userName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", flex: 1 },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, color: "#FFFFFF", fontWeight: "700" },
  userEmail: { fontSize: 12, color: "#6B7280" },
  userArea: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  enrolledRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  enrolledDot: { width: 7, height: 7, borderRadius: 4 },
  enrolledText: { fontSize: 11, color: "#6B7280" },
  deleteBtn: { padding: 4 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  modalBody: { padding: 16, maxHeight: 400 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  errorTitle: { fontSize: 13, fontWeight: "600", color: "#CC2229", marginBottom: 4 },
  errorItem: { fontSize: 12, color: "#CC2229" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  required: { color: "#CC2229" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#1A1A2E",
    backgroundColor: "#FAFAFA",
  },
  inputError: { borderColor: "#CC2229", backgroundColor: "#FEF2F2" },
  roleSelector: { flexDirection: "row", gap: 10 },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  roleOptionActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  roleOptionText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  roleOptionTextActive: { color: "#FFFFFF" },
  saveBtn: {
    backgroundColor: "#CC2229",
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  csvFormatBox: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  csvFormatTitle: { fontSize: 13, fontWeight: "600", color: "#0369A1", marginBottom: 6 },
  csvFormatCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    color: "#374151",
    lineHeight: 18,
  },
  csvInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: "#1A1A2E",
    backgroundColor: "#FAFAFA",
    height: 160,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  csvPreview: {
    fontSize: 12,
    color: "#5CB85C",
    fontWeight: "600",
    marginTop: 6,
  },
});
