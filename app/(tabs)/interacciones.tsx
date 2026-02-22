import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Modal, FlatList
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";

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
  observations?: string;
};

const EMPTY_TASK: TaskForm = {
  taskActivity: "",
  documentRoute: "",
  responsibleRole: "",
  ansUndefined: false,
  ansNumber: undefined,
  ansType: "dias_habiles",
  ansCompliance: undefined,
  observations: "",
};

// ─── Admin View: All Interactions with process filter ────────────────────────

function AdminInteraccionesView() {
  const allInteractionsQuery = trpc.admin.getAllInteractions.useQuery();
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<InteractionType>("proveedor");

  const allData = allInteractionsQuery.data ?? [];

  const filteredData = useMemo(() => {
    const byProcess = selectedProcessId === null ? allData : allData.filter(p => p.processId === selectedProcessId);
    return byProcess.map(p => ({
      ...p,
      interactions: p.interactions.filter((i: any) => i.type === activeType),
    })).filter(p => p.interactions.length > 0);
  }, [allData, selectedProcessId, activeType]);

  const typeConfig = {
    proveedor: { label: "Proveedores", icon: "📦", color: "#F5A623" },
    cliente: { label: "Clientes", icon: "🤝", color: "#6366F1" },
  };

  if (allInteractionsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.loadingText}>Cargando interacciones de todos los procesos...</Text>
      </View>
    );
  }

  if (allData.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔗</Text>
        <Text style={styles.emptyTitle}>Sin interacciones registradas</Text>
        <Text style={styles.emptyText}>Ningún líder de área ha registrado interacciones aún.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, selectedProcessId === null && styles.filterBtnActive]}
          onPress={() => setSelectedProcessId(null)}
        >
          <Text style={[styles.filterBtnText, selectedProcessId === null && styles.filterBtnTextActive]}>
            Todos ({allData.length})
          </Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {allData.map(p => (
            <TouchableOpacity
              key={p.processId}
              style={[styles.filterBtn, selectedProcessId === p.processId && styles.filterBtnActive]}
              onPress={() => setSelectedProcessId(p.processId)}
            >
              <Text
                style={[styles.filterBtnText, selectedProcessId === p.processId && styles.filterBtnTextActive]}
                numberOfLines={1}
              >
                {p.processName || p.areaName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{typeConfig[activeType].icon}</Text>
            <Text style={styles.emptyTitle}>Sin {typeConfig[activeType].label.toLowerCase()}</Text>
            <Text style={styles.emptyText}>No hay {typeConfig[activeType].label.toLowerCase()} registrados para el filtro seleccionado.</Text>
          </View>
        ) : (
          filteredData.map(processGroup => (
            <View key={processGroup.processId} style={styles.processBlock}>
              <View style={styles.processBlockHeader}>
                <MaterialIcons name="business" size={18} color="#FFFFFF" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.processBlockTitle}>{processGroup.processName || processGroup.areaName}</Text>
                  {processGroup.leaderName ? (
                    <Text style={styles.processBlockLeader}>Líder: {processGroup.leaderName}</Text>
                  ) : null}
                </View>
                <View style={styles.kpiCountBadge}>
                  <Text style={styles.kpiCountBadgeText}>{processGroup.interactions.length}</Text>
                </View>
              </View>
              {processGroup.interactions.map((interaction: any) => (
                <View key={interaction.id} style={styles.adminInteractionCard}>
                  <View style={[styles.adminInteractionDot, { backgroundColor: typeConfig[activeType].color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminInteractionName}>{interaction.relatedProcessName}</Text>
                    {interaction.tasks?.length > 0 && (
                      <Text style={styles.adminInteractionMeta}>{interaction.tasks.length} tarea{interaction.tasks.length !== 1 ? "s" : ""}</Text>
                    )}
                    {interaction.strengths?.length > 0 && (
                      <Text style={styles.adminInteractionMeta}>{interaction.strengths.length} fortaleza{interaction.strengths.length !== 1 ? "s" : ""}/oportunidad{interaction.strengths.length !== 1 ? "es" : ""}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── User View: Own Interactions ──────────────────────────────────────────────

export default function InteraccionesScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [activeType, setActiveType] = useState<InteractionType>(
    (params.type as InteractionType) ?? "proveedor"
  );
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [newInteractionName, setNewInteractionName] = useState("");
  const [interactionNameError, setInteractionNameError] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK);
  const [taskErrors, setTaskErrors] = useState<string[]>([]);
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
      setInteractionNameError("⚠️ El nombre del proceso es obligatorio");
      return;
    }
    setInteractionNameError("");
    createInteraction.mutate({ type: activeType, relatedProcessName: newInteractionName.trim() });
  };

  const validateTask = (): boolean => {
    const errors: string[] = [];
    if (!taskForm.taskActivity.trim()) errors.push("• Tarea / Actividad es obligatoria");
    if (!taskForm.documentRoute.trim()) errors.push("• Documento / Ruta es obligatorio");
    if (!taskForm.responsibleRole.trim()) errors.push("• Responsable es obligatorio");
    if (!taskForm.ansUndefined) {
      if (!taskForm.ansNumber) errors.push("• Número de días del ANS es obligatorio");
      if (!taskForm.ansType) errors.push("• Tipo de ANS (días calendario/hábiles) es obligatorio");
      if (!taskForm.ansCompliance) errors.push("• Nivel de cumplimiento ANS es obligatorio");
    }
    setTaskErrors(errors);
    return errors.length === 0;
  };

  const handleAddTask = () => {
    if (!validateTask()) return;
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

  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  if (isAdmin) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <View>
            <Text style={styles.headerTitle}>Interacciones del Proceso</Text>
            <Text style={styles.headerSubtitle}>Vista administrador — todos los procesos</Text>
          </View>
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
        <AdminInteraccionesView />
      </ScreenContainer>
    );
  }

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
              <Text style={styles.inputLabel}>Nombre del Proceso *</Text>
            {interactionNameError ? <Text style={styles.fieldError}>{interactionNameError}</Text> : null}
            <TextInput
              style={[styles.input, interactionNameError ? styles.inputError : null]}
              value={newInteractionName}
              onChangeText={v => { setNewInteractionName(v); setInteractionNameError(""); }}
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

              {taskErrors.length > 0 && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>⚠️ Campos obligatorios incompletos:</Text>
                  {taskErrors.map((e, i) => <Text key={i} style={styles.errorItem}>{e}</Text>)}
                </View>
              )}

              <Text style={styles.inputLabel}>Tarea / Actividad *</Text>
              <TextInput style={[styles.input, { minHeight: 60 }, taskErrors.some(e => e.includes("Tarea")) && styles.inputError]} value={taskForm.taskActivity} onChangeText={v => setTaskForm(f => ({ ...f, taskActivity: v }))} placeholder="Describe la tarea o actividad" placeholderTextColor="#9CA3AF" multiline />

              <Text style={styles.inputLabel}>Documento / Ruta *</Text>
              <TextInput style={[styles.input, taskErrors.some(e => e.includes("Documento")) && styles.inputError]} value={taskForm.documentRoute} onChangeText={v => setTaskForm(f => ({ ...f, documentRoute: v }))} placeholder="Ej: Formato FO-LOG-001" placeholderTextColor="#9CA3AF" />

              <Text style={styles.inputLabel}>Responsable *</Text>
              <TextInput style={[styles.input, taskErrors.some(e => e.includes("Responsable")) && styles.inputError]} value={taskForm.responsibleRole} onChangeText={v => setTaskForm(f => ({ ...f, responsibleRole: v }))} placeholder="Ej: Coordinador de Logística" placeholderTextColor="#9CA3AF" />

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
                            {t.label}
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

              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={taskForm.observations ?? ""}
                onChangeText={v => setTaskForm(f => ({ ...f, observations: v }))}
                placeholder="Observaciones adicionales sobre esta tarea..."
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); setTaskErrors([]); }}>
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
  ansTypeBtn: { paddingHorizontal: 6, paddingVertical: 6, borderRadius: 6, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 8, padding: 12, marginBottom: 14 },
  errorTitle: { fontSize: 13, fontWeight: "700", color: "#CC2229", marginBottom: 4 },
  errorItem: { fontSize: 12, color: "#CC2229", lineHeight: 20 },
  inputError: { borderColor: "#CC2229", backgroundColor: "#FEF2F2" },
  fieldError: { fontSize: 12, color: "#CC2229", marginBottom: 4, fontWeight: "600" },
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
  // Admin styles
  adminBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1B4F9B",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4,
  },
  adminBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },
  filterBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
    marginRight: 4,
  },
  filterBtnActive: { backgroundColor: "#CC2229", borderColor: "#CC2229" },
  filterBtnText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  filterBtnTextActive: { color: "#FFFFFF" },
  processBlock: {
    marginBottom: 16, borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  processBlockHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1B4F9B", paddingHorizontal: 14, paddingVertical: 10,
  },
  processBlockTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  processBlockLeader: { fontSize: 11, color: "#BFD4F7", marginTop: 2 },
  kpiCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  kpiCountBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  adminInteractionCard: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  adminInteractionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 4 },
  adminInteractionName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  adminInteractionMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },
});
