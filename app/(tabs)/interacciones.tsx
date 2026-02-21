import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Modal, FlatList
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";

const ANS_TYPES = [
  { value: "dias_calendario", label: "Días Calendario" },
  { value: "dias_habiles", label: "Días Hábiles" },
  { value: "semanas", label: "Semanas" },
  { value: "meses", label: "Meses" },
] as const;

type AnsType = "dias_calendario" | "dias_habiles" | "semanas" | "meses";
type InteractionType = "proveedor" | "cliente";

type TaskForm = {
  taskActivity: string;
  documentRoute: string;
  responsibleRole: string;
  ansUndefined: boolean;
  ansNumber?: number;
  ansType?: AnsType;
  ansCompliance?: number;
};

const EMPTY_TASK: TaskForm = {
  taskActivity: "",
  documentRoute: "",
  responsibleRole: "",
  ansUndefined: false,
  ansNumber: undefined,
  ansType: "dias_habiles",
  ansCompliance: undefined,
};

export default function InteraccionesScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [activeType, setActiveType] = useState<InteractionType>(
    (params.type as InteractionType) ?? "proveedor"
  );
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [newInteractionName, setNewInteractionName] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK);
  const [newStrengthType, setNewStrengthType] = useState<"fortaleza" | "oportunidad">("fortaleza");
  const [newStrengthText, setNewStrengthText] = useState("");
  const [expandedInteractionId, setExpandedInteractionId] = useState<number | null>(null);

  const interactionsQuery = trpc.interaction.list.useQuery({ type: activeType });

  const createInteraction = trpc.interaction.create.useMutation({
    onSuccess: () => { interactionsQuery.refetch(); setShowAddInteraction(false); setNewInteractionName(""); },
  });

  const deleteInteraction = trpc.interaction.delete.useMutation({
    onSuccess: () => interactionsQuery.refetch(),
  });

  const tasksQuery = trpc.interactionTask.list.useQuery(
    { interactionId: expandedInteractionId ?? 0 },
    { enabled: !!expandedInteractionId }
  );

  const strengthsQuery = trpc.interactionStrength.list.useQuery(
    { interactionId: expandedInteractionId ?? 0 },
    { enabled: !!expandedInteractionId }
  );

  const createTask = trpc.interactionTask.create.useMutation({
    onSuccess: () => { tasksQuery.refetch(); setShowTaskModal(false); setTaskForm(EMPTY_TASK); },
  });

  const deleteTask = trpc.interactionTask.delete.useMutation({
    onSuccess: () => tasksQuery.refetch(),
  });

  const createStrength = trpc.interactionStrength.create.useMutation({
    onSuccess: () => { strengthsQuery.refetch(); setShowStrengthModal(false); setNewStrengthText(""); },
  });

  const deleteStrength = trpc.interactionStrength.delete.useMutation({
    onSuccess: () => strengthsQuery.refetch(),
  });

  const interactions = interactionsQuery.data ?? [];

  const handleAddInteraction = () => {
    if (!newInteractionName.trim()) {
      Alert.alert("Error", "Ingresa el nombre del proceso");
      return;
    }
    createInteraction.mutate({ type: activeType, relatedProcessName: newInteractionName.trim() });
  };

  const handleAddTask = () => {
    if (!taskForm.taskActivity.trim() || !taskForm.documentRoute.trim() || !taskForm.responsibleRole.trim()) {
      Alert.alert("Campos requeridos", "Completa Actividad, Documento/Ruta y Responsable");
      return;
    }
    if (!taskForm.ansUndefined && (!taskForm.ansNumber || !taskForm.ansType || !taskForm.ansCompliance)) {
      Alert.alert("ANS requerido", "Completa el ANS o marca como 'No definido'");
      return;
    }
    createTask.mutate({
      interactionId: selectedInteractionId!,
      taskActivity: taskForm.taskActivity.trim(),
      documentRoute: taskForm.documentRoute.trim(),
      responsibleRole: taskForm.responsibleRole.trim(),
      ansUndefined: taskForm.ansUndefined,
      ansNumber: taskForm.ansUndefined ? undefined : taskForm.ansNumber,
      ansType: taskForm.ansUndefined ? undefined : taskForm.ansType,
      ansCompliance: taskForm.ansUndefined ? undefined : taskForm.ansCompliance,
    });
  };

  const handleAddStrength = () => {
    if (!newStrengthText.trim()) return;
    createStrength.mutate({
      interactionId: selectedInteractionId!,
      type: newStrengthType,
      description: newStrengthText.trim(),
    });
  };

  const typeConfig = {
    proveedor: { label: "Proveedores", icon: "📦", color: "#F5A623", bgColor: "#FFFBEB", description: "Procesos que proveen entradas a este proceso" },
    cliente: { label: "Clientes", icon: "🤝", color: "#6366F1", bgColor: "#EEF2FF", description: "Procesos que reciben salidas de este proceso" },
  };

  const config = typeConfig[activeType];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interacciones del Proceso</Text>
        <Text style={styles.headerSubtitle}>Proveedores y Clientes</Text>
      </View>

      {/* Type Tabs */}
      <View style={styles.typeTabs}>
        {(["proveedor", "cliente"] as InteractionType[]).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.typeTab, activeType === type && styles.typeTabActive]}
            onPress={() => setActiveType(type)}
          >
            <Text style={styles.typeTabIcon}>{typeConfig[type].icon}</Text>
            <Text style={[styles.typeTabText, activeType === type && styles.typeTabTextActive]}>
              {typeConfig[type].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section Description */}
      <View style={[styles.sectionDesc, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.sectionDescText, { color: config.color }]}>{config.description}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {interactionsQuery.isLoading ? (
          <ActivityIndicator color="#CC2229" style={{ marginTop: 40 }} />
        ) : (
          <>
            {interactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>{config.icon}</Text>
                <Text style={styles.emptyTitle}>Sin {config.label.toLowerCase()} registrados</Text>
                <Text style={styles.emptyText}>Agrega los procesos {activeType === "proveedor" ? "que proveen a" : "que reciben de"} tu área</Text>
              </View>
            ) : (
              interactions.map(interaction => {
                const isExpanded = expandedInteractionId === interaction.id;
                return (
                  <View key={interaction.id} style={styles.interactionCard}>
                    <TouchableOpacity
                      style={styles.interactionHeader}
                      onPress={() => setExpandedInteractionId(isExpanded ? null : interaction.id)}
                    >
                      <View style={[styles.interactionDot, { backgroundColor: config.color }]} />
                      <Text style={styles.interactionName}>{interaction.relatedProcessName}</Text>
                      <View style={styles.interactionActions}>
                        <TouchableOpacity
                          onPress={() => Alert.alert("Eliminar", `¿Eliminar "${interaction.relatedProcessName}"?`, [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Eliminar", style: "destructive", onPress: () => deleteInteraction.mutate({ id: interaction.id }) },
                          ])}
                        >
                          <Text style={styles.deleteIcon}>🗑</Text>
                        </TouchableOpacity>
                        <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.interactionBody}>
                        {/* Tasks Section */}
                        <View style={styles.subSection}>
                          <View style={styles.subSectionHeader}>
                            <Text style={styles.subSectionTitle}>Tareas / Actividades</Text>
                            <TouchableOpacity
                              style={[styles.subAddBtn, { backgroundColor: config.color }]}
                              onPress={() => { setSelectedInteractionId(interaction.id); setShowTaskModal(true); }}
                            >
                              <Text style={styles.subAddBtnText}>+ Tarea</Text>
                            </TouchableOpacity>
                          </View>
                          {(tasksQuery.data ?? []).map(task => (
                            <View key={task.id} style={styles.taskItem}>
                              <View style={styles.taskInfo}>
                                <Text style={styles.taskActivity}>{task.taskActivity}</Text>
                                <Text style={styles.taskMeta}>📄 {task.documentRoute}</Text>
                                <Text style={styles.taskMeta}>👤 {task.responsibleRole}</Text>
                                <Text style={styles.taskMeta}>
                                  ⏱ ANS: {task.ansUndefined ? "No definido" : `${task.ansNumber} ${ANS_TYPES.find(t => t.value === task.ansType)?.label ?? ""} | Cumplimiento: ${task.ansCompliance}/5`}
                                </Text>
                              </View>
                              <TouchableOpacity onPress={() => deleteTask.mutate({ id: task.id })}>
                                <Text style={styles.deleteIcon}>🗑</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                          {(tasksQuery.data ?? []).length === 0 && (
                            <Text style={styles.emptySubText}>Sin tareas registradas</Text>
                          )}
                        </View>

                        {/* Strengths Section */}
                        <View style={styles.subSection}>
                          <View style={styles.subSectionHeader}>
                            <Text style={styles.subSectionTitle}>Fortalezas y Oportunidades</Text>
                            <TouchableOpacity
                              style={[styles.subAddBtn, { backgroundColor: "#5CB85C" }]}
                              onPress={() => { setSelectedInteractionId(interaction.id); setShowStrengthModal(true); }}
                            >
                              <Text style={styles.subAddBtnText}>+ Agregar</Text>
                            </TouchableOpacity>
                          </View>
                          {(strengthsQuery.data ?? []).map(strength => (
                            <View key={strength.id} style={[styles.strengthItem, { borderLeftColor: strength.type === "fortaleza" ? "#5CB85C" : "#F5A623" }]}>
                              <View style={styles.strengthInfo}>
                                <Text style={[styles.strengthType, { color: strength.type === "fortaleza" ? "#5CB85C" : "#F5A623" }]}>
                                  {strength.type === "fortaleza" ? "💪 Fortaleza" : "💡 Oportunidad"}
                                </Text>
                                <Text style={styles.strengthText}>{strength.description}</Text>
                              </View>
                              <TouchableOpacity onPress={() => deleteStrength.mutate({ id: strength.id })}>
                                <Text style={styles.deleteIcon}>🗑</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                          {(strengthsQuery.data ?? []).length === 0 && (
                            <Text style={styles.emptySubText}>Sin fortalezas u oportunidades registradas</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Add Interaction Button */}
            <TouchableOpacity
              style={[styles.addInteractionBtn, { borderColor: config.color }]}
              onPress={() => setShowAddInteraction(true)}
            >
              <Text style={[styles.addInteractionText, { color: config.color }]}>
                {config.icon} Agregar {activeType === "proveedor" ? "Proveedor" : "Cliente"}
              </Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Interaction Modal */}
      <Modal visible={showAddInteraction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Agregar {activeType === "proveedor" ? "Proveedor" : "Cliente"}
            </Text>
            <Text style={styles.inputLabel}>Nombre del Proceso</Text>
            <TextInput
              style={styles.input}
              value={newInteractionName}
              onChangeText={setNewInteractionName}
              placeholder={activeType === "proveedor" ? "Ej: Proceso de Compras" : "Ej: Proceso de Ventas"}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowAddInteraction(false); setNewInteractionName(""); }}>
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: config.color }]} onPress={handleAddInteraction} disabled={createInteraction.isPending}>
                {createInteraction.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Agregar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showTaskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={{ maxHeight: "90%" }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nueva Tarea / Actividad</Text>

              <Text style={styles.inputLabel}>Tarea / Actividad *</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={taskForm.taskActivity} onChangeText={v => setTaskForm(f => ({ ...f, taskActivity: v }))} placeholder="Describe la tarea o actividad" placeholderTextColor="#9CA3AF" multiline />

              <Text style={styles.inputLabel}>Documento / Ruta *</Text>
              <TextInput style={styles.input} value={taskForm.documentRoute} onChangeText={v => setTaskForm(f => ({ ...f, documentRoute: v }))} placeholder="Ej: Formato FO-LOG-001" placeholderTextColor="#9CA3AF" />

              <Text style={styles.inputLabel}>Responsable *</Text>
              <TextInput style={styles.input} value={taskForm.responsibleRole} onChangeText={v => setTaskForm(f => ({ ...f, responsibleRole: v }))} placeholder="Ej: Coordinador de Logística" placeholderTextColor="#9CA3AF" />

              <Text style={styles.sectionSubTitle}>ANS (Acuerdo de Nivel de Servicio)</Text>

              <TouchableOpacity
                style={[styles.checkRow, taskForm.ansUndefined && styles.checkRowActive]}
                onPress={() => setTaskForm(f => ({ ...f, ansUndefined: !f.ansUndefined }))}
              >
                <View style={[styles.checkbox, taskForm.ansUndefined && styles.checkboxActive]}>
                  {taskForm.ansUndefined && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>ANS No Definido</Text>
              </TouchableOpacity>

              {!taskForm.ansUndefined && (
                <>
                  <Text style={styles.inputLabel}>Tiempo de Respuesta</Text>
                  <View style={styles.ansRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={taskForm.ansNumber?.toString() ?? ""}
                      onChangeText={v => setTaskForm(f => ({ ...f, ansNumber: parseInt(v) || undefined }))}
                      placeholder="1-9"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                    <View style={styles.ansTypeSelector}>
                      {ANS_TYPES.map(t => (
                        <TouchableOpacity
                          key={t.value}
                          style={[styles.ansTypeBtn, taskForm.ansType === t.value && styles.ansTypeBtnActive]}
                          onPress={() => setTaskForm(f => ({ ...f, ansType: t.value }))}
                        >
                          <Text style={[styles.ansTypeBtnText, taskForm.ansType === t.value && styles.ansTypeBtnTextActive]}>
                            {t.label.split(" ")[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Nivel de Cumplimiento (1-5)</Text>
                  <View style={styles.complianceSelector}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[styles.complianceBtn, taskForm.ansCompliance === n && styles.complianceBtnActive]}
                        onPress={() => setTaskForm(f => ({ ...f, ansCompliance: n }))}
                      >
                        <Text style={[styles.complianceBtnText, taskForm.ansCompliance === n && styles.complianceBtnTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); }}>
                  <Text style={styles.cancelModalText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddTask} disabled={createTask.isPending}>
                  {createTask.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Strength Modal */}
      <Modal visible={showStrengthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Fortaleza u Oportunidad</Text>
            <Text style={styles.inputLabel}>Tipo</Text>
            <View style={styles.strengthTypeSelector}>
              <TouchableOpacity
                style={[styles.strengthTypeBtn, newStrengthType === "fortaleza" && { backgroundColor: "#5CB85C", borderColor: "#5CB85C" }]}
                onPress={() => setNewStrengthType("fortaleza")}
              >
                <Text style={[styles.strengthTypeBtnText, newStrengthType === "fortaleza" && { color: "#FFF" }]}>💪 Fortaleza</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.strengthTypeBtn, newStrengthType === "oportunidad" && { backgroundColor: "#F5A623", borderColor: "#F5A623" }]}
                onPress={() => setNewStrengthType("oportunidad")}
              >
                <Text style={[styles.strengthTypeBtnText, newStrengthType === "oportunidad" && { color: "#FFF" }]}>💡 Oportunidad</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={newStrengthText}
              onChangeText={setNewStrengthText}
              placeholder="Describe la fortaleza u oportunidad..."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowStrengthModal(false); setNewStrengthText(""); }}>
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddStrength} disabled={createStrength.isPending}>
                {createStrength.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Agregar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  typeTabs: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  typeTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6, borderBottomWidth: 3, borderBottomColor: "transparent" },
  typeTabActive: { borderBottomColor: "#CC2229" },
  typeTabIcon: { fontSize: 18 },
  typeTabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  typeTabTextActive: { color: "#1A1A2E" },
  sectionDesc: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionDescText: { fontSize: 13, fontWeight: "500" },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  interactionCard: { backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  interactionHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  interactionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  interactionName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  interactionActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteIcon: { fontSize: 16, padding: 4 },
  chevron: { fontSize: 12, color: "#9CA3AF" },
  interactionBody: { borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 14 },
  subSection: { marginBottom: 16 },
  subSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  subSectionTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  subAddBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  subAddBtnText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  taskItem: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#F8F9FA", borderRadius: 8, padding: 10, marginBottom: 6 },
  taskInfo: { flex: 1 },
  taskActivity: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", marginBottom: 3 },
  taskMeta: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  strengthItem: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#F8F9FA", borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3 },
  strengthInfo: { flex: 1 },
  strengthType: { fontSize: 12, fontWeight: "700", marginBottom: 3 },
  strengthText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  emptySubText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", paddingVertical: 4 },
  addInteractionBtn: { borderWidth: 2, borderStyle: "dashed", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  addInteractionText: { fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A2E", marginBottom: 14 },
  sectionSubTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 10, marginTop: 4 },
  checkRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, backgroundColor: "#F3F4F6", marginBottom: 12 },
  checkRowActive: { backgroundColor: "#EFF6FF" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB", marginRight: 10, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  checkmark: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  ansRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  ansTypeSelector: { flex: 2, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  ansTypeBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  ansTypeBtnActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  ansTypeBtnText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  ansTypeBtnTextActive: { color: "#FFF" },
  complianceSelector: { flexDirection: "row", gap: 8, marginBottom: 14 },
  complianceBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center", borderWidth: 1.5, borderColor: "#E5E7EB" },
  complianceBtnActive: { backgroundColor: "#CC2229", borderColor: "#CC2229" },
  complianceBtnText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  complianceBtnTextActive: { color: "#FFF" },
  strengthTypeSelector: { flexDirection: "row", gap: 8, marginBottom: 14 },
  strengthTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center", borderWidth: 1.5, borderColor: "#E5E7EB" },
  strengthTypeBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelModalBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  cancelModalText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
  saveModalBtn: { flex: 1, backgroundColor: "#CC2229", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  saveModalText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
