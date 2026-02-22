import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { KeyboardModal } from "@/components/keyboard-modal";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";

const LIS_RED = "#E63946";
const LIS_BLUE = "#1D3557";
const LIS_YELLOW = "#F4D35E";
const LIS_GREEN = "#52B788";
const LIS_ORANGE = "#F4A261";
const LIS_GRAY = "#6B7280";

type ProjectStatus = "por_priorizar" | "en_ejecucion" | "finalizado" | "suspendido" | "cancelado";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; textColor: string }> = {
  por_priorizar: { label: "Por Priorizar", color: LIS_RED, textColor: "#fff" },
  en_ejecucion: { label: "En Ejecución", color: LIS_YELLOW, textColor: "#1D3557" },
  finalizado: { label: "Finalizado", color: LIS_GREEN, textColor: "#fff" },
  suspendido: { label: "Suspendido", color: LIS_ORANGE, textColor: "#fff" },
  cancelado: { label: "Cancelado", color: LIS_GRAY, textColor: "#fff" },
};

const IMPACT_LABELS = ["", "Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
const DIFFICULTY_LABELS = ["", "Muy Difícil", "Difícil", "Moderado", "Fácil", "Muy Fácil"];

interface Project {
  id: number;
  name: string;
  description: string;
  impact: number;
  difficulty: number;
  subtotal: number;
  status: ProjectStatus;
  statusObservations: string | null;
  hasNotification: boolean;
  notificationMessage: string | null;
}

function RatingSelector({
  value,
  onChange,
  labels,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  color: string;
}) {
  return (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          style={[
            styles.ratingButton,
            value === n && { backgroundColor: color, borderColor: color },
          ]}
        >
          <Text style={[styles.ratingNumber, value === n && { color: "#fff" }]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDismissNotification,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
  onDismissNotification: (id: number) => void;
}) {
  const statusCfg = STATUS_CONFIG[project.status];
  const scoreColor =
    project.subtotal >= 20
      ? LIS_RED
      : project.subtotal >= 12
      ? LIS_ORANGE
      : project.subtotal >= 6
      ? LIS_YELLOW
      : LIS_GREEN;

  return (
    <View style={styles.card}>
      {project.hasNotification && (
        <TouchableOpacity
          style={styles.notificationBanner}
          onPress={() => onDismissNotification(project.id)}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          <Text style={styles.notificationText}>
            {project.notificationMessage || "El administrador modificó este proyecto"}
          </Text>
          <Text style={styles.notificationDismiss}>✕</Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {project.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
            <Text style={[styles.statusText, { color: statusCfg.textColor }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardDescription} numberOfLines={3}>
        {project.description}
      </Text>

      <View style={styles.scoreRow}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Impacto</Text>
          <Text style={styles.scoreValue}>{project.impact}/5</Text>
          <Text style={styles.scoreSubLabel}>{IMPACT_LABELS[project.impact]}</Text>
        </View>
        <Text style={styles.scoreMult}>×</Text>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Dificultad</Text>
          <Text style={styles.scoreValue}>{project.difficulty}/5</Text>
          <Text style={styles.scoreSubLabel}>{DIFFICULTY_LABELS[project.difficulty]}</Text>
        </View>
        <Text style={styles.scoreMult}>=</Text>
        <View style={[styles.scoreTotal, { borderColor: scoreColor }]}>
          <Text style={styles.scoreTotalLabel}>Score</Text>
          <Text style={[styles.scoreTotalValue, { color: scoreColor }]}>{project.subtotal}</Text>
        </View>
      </View>

      {project.statusObservations ? (
        <View style={styles.obsRow}>
          <Text style={styles.obsLabel}>Observaciones: </Text>
          <Text style={styles.obsText}>{project.statusObservations}</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: LIS_BLUE }]}
          onPress={() => onEdit(project)}
        >
          <Text style={[styles.actionBtnText, { color: LIS_BLUE }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: LIS_RED }]}
          onPress={() =>
            Alert.alert("Eliminar proyecto", `¿Eliminar "${project.name}"?`, [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => onDelete(project.id) },
            ])
          }
        >
          <Text style={[styles.actionBtnText, { color: LIS_RED }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProyectosScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState(3);
  const [difficulty, setDifficulty] = useState(3);

  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);

  // User sees only their own projects; admin/superadmin see all projects consolidated
  const userQuery = trpc.project.list.useQuery(undefined, { enabled: !isAdmin });
  const adminQuery = trpc.admin.getAllProjects.useQuery(undefined, { enabled: isAdmin });
  const allAdminProjects = isAdmin ? ((adminQuery.data ?? []) as any[]) : [];

  // Build unique process list for filter dropdown
  const adminProcesses = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string }[] = [];
    for (const p of allAdminProjects) {
      const pid = p.processId;
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        list.push({ id: pid, name: p.processName || p.areaName || `Proceso ${pid}` });
      }
    }
    return list;
  }, [allAdminProjects]);

  const projectList: Project[] = isAdmin
    ? (selectedProcessId === null
        ? allAdminProjects
        : allAdminProjects.filter((p: any) => p.processId === selectedProcessId)
      ).sort((a: any, b: any) => b.subtotal - a.subtotal)
    : (userQuery.data ?? []) as Project[];
  const isLoading = isAdmin ? adminQuery.isLoading : userQuery.isLoading;
  const refetch = isAdmin ? adminQuery.refetch : userQuery.refetch;

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => Alert.alert("Error", e.message),
  });

  const dismissMutation = trpc.project.dismissNotification.useMutation({
    onSuccess: () => refetch(),
  });

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setImpact(3);
    setDifficulty(3);
    setEditingProject(null);
    setShowForm(false);
  }, []);

  const openEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setImpact(project.impact);
    setDifficulty(project.difficulty);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Campo requerido", "El nombre del proyecto es obligatorio.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Campo requerido", "La descripción del proyecto es obligatoria.");
      return;
    }

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, name: name.trim(), description: description.trim(), impact, difficulty });
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim(), impact, difficulty });
    }
  }, [name, description, impact, difficulty, editingProject]);

  const subtotalPreview = impact * difficulty;
  const subtotalColor =
    subtotalPreview >= 20 ? LIS_RED : subtotalPreview >= 12 ? LIS_ORANGE : subtotalPreview >= 6 ? LIS_YELLOW : LIS_GREEN;

  const hasNotifications = (projectList as Project[]).some((p) => p.hasNotification);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Proyectos</Text>
          <Text style={styles.headerSub}>
            {(projectList as Project[]).length} proyecto{(projectList as Project[]).length !== 1 ? "s" : ""} registrado{(projectList as Project[]).length !== 1 ? "s" : ""}
          </Text>
        </View>
        {isAdmin ? (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : null}
        {hasNotifications && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>
              {(projectList as Project[]).filter((p) => p.hasNotification).length}
            </Text>
          </View>
        )}
        {!isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
            <Text style={styles.addBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Admin process filter bar */}
      {isAdmin && adminProcesses.length > 0 && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, selectedProcessId === null && styles.filterBtnActive]}
            onPress={() => setSelectedProcessId(null)}
          >
            <Text style={[styles.filterBtnText, selectedProcessId === null && styles.filterBtnTextActive]}>
              Todos ({allAdminProjects.length})
            </Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {adminProcesses.map((p: { id: number; name: string }) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterBtn, selectedProcessId === p.id && styles.filterBtnActive]}
                onPress={() => setSelectedProcessId(p.id)}
              >
                <Text
                  style={[styles.filterBtnText, selectedProcessId === p.id && styles.filterBtnTextActive]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LIS_BLUE} />
        </View>
      ) : (projectList as Project[]).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin proyectos registrados</Text>
          <Text style={styles.emptyDesc}>
            Agrega los proyectos de tu área para priorizarlos según impacto y dificultad.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setShowForm(true); }}>
            <Text style={styles.emptyBtnText}>Agregar primer proyecto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projectList as Project[]}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onEdit={openEdit}
              onDelete={(id) => deleteMutation.mutate({ id })}
              onDismissNotification={(id) => dismissMutation.mutate({ id })}
            />
          )}
        />
      )}

      {/* Form Modal */}
      <KeyboardModal
        visible={showForm}
        onClose={resetForm}
        title={editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={styles.fieldLabel}>Nombre del Proyecto *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Implementación de sistema ERP"
            placeholderTextColor="#9CA3AF"
            maxLength={255}
          />
          <Text style={styles.fieldLabel}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe el proyecto, sus objetivos y alcance..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.fieldLabel}>
            Impacto: <Text style={{ color: LIS_RED, fontWeight: "700" }}>{impact}</Text> — {IMPACT_LABELS[impact]}
          </Text>
          <Text style={styles.fieldHint}>¿Qué tan grande es el beneficio si se ejecuta?</Text>
          <RatingSelector value={impact} onChange={setImpact} labels={IMPACT_LABELS} color={LIS_RED} />
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Dificultad: <Text style={{ color: LIS_BLUE, fontWeight: "700" }}>{difficulty}</Text> — {DIFFICULTY_LABELS[difficulty]}
          </Text>
          <Text style={styles.fieldHint}>¿Qué tan complejo es implementarlo?</Text>
          <RatingSelector value={difficulty} onChange={setDifficulty} labels={DIFFICULTY_LABELS} color={LIS_BLUE} />
          <View style={[styles.scorePreview, { borderColor: subtotalColor }]}>
            <Text style={styles.scorePreviewLabel}>Score calculado</Text>
            <Text style={[styles.scorePreviewValue, { color: subtotalColor }]}>
              {impact} × {difficulty} = {subtotalPreview}
            </Text>
            <Text style={styles.scorePreviewHint}>
              {subtotalPreview >= 20 ? "Prioridad Crítica" : subtotalPreview >= 12 ? "Prioridad Alta" : subtotalPreview >= 6 ? "Prioridad Media" : "Prioridad Baja"}
            </Text>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (createMutation.isPending || updateMutation.isPending) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editingProject ? "Actualizar" : "Guardar"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: LIS_BLUE,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  notifBadge: {
    backgroundColor: LIS_RED,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: LIS_RED,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: LIS_BLUE,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: LIS_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: LIS_YELLOW,
  },
  notificationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  notificationText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  notificationDismiss: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "700",
    marginLeft: 8,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: LIS_BLUE,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scoreItem: {
    alignItems: "center",
    flex: 1,
  },
  scoreLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: LIS_BLUE,
  },
  scoreSubLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  scoreMult: {
    fontSize: 20,
    color: "#9CA3AF",
    fontWeight: "300",
    paddingHorizontal: 4,
  },
  scoreTotal: {
    alignItems: "center",
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 8,
  },
  scoreTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  scoreTotalValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  obsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  obsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  obsText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: LIS_BLUE,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: LIS_BLUE,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 16,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  ratingButton: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  scorePreview: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#FAFAFA",
  },
  scorePreviewLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  scorePreviewValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  scorePreviewHint: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveBtn: {
    flex: 2,
    backgroundColor: LIS_BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  // Admin styles
  adminBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1B4F9B",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4, marginRight: 8,
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
  filterBtnActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  filterBtnText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  filterBtnTextActive: { color: "#FFFFFF" },
});
