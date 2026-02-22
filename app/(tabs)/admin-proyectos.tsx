import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

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

const STATUS_LIST: ProjectStatus[] = [
  "por_priorizar",
  "en_ejecucion",
  "finalizado",
  "suspendido",
  "cancelado",
];

const IMPACT_LABELS = ["", "Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
const DIFFICULTY_LABELS = ["", "Muy Difícil", "Difícil", "Moderado", "Fácil", "Muy Fácil"];

interface AdminProject {
  id: number;
  name: string;
  description: string;
  impact: number;
  difficulty: number;
  subtotal: number;
  status: ProjectStatus;
  statusObservations: string | null;
  hasNotification: boolean;
  processName: string;
  areaName: string;
  leaderName: string;
  leaderEmail: string;
}

function RatingSelector({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
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

export default function AdminProyectosScreen() {
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [editImpact, setEditImpact] = useState(3);
  const [editDifficulty, setEditDifficulty] = useState(3);
  const [editStatus, setEditStatus] = useState<ProjectStatus>("por_priorizar");
  const [editObservations, setEditObservations] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [filterArea, setFilterArea] = useState<string>("all");

  const { data: allProjects = [], refetch, isLoading } = trpc.admin.getAllProjects.useQuery();

  const updateMutation = trpc.admin.updateProject.useMutation({
    onSuccess: () => {
      refetch();
      setEditingProject(null);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const openEdit = useCallback((project: AdminProject) => {
    setEditingProject(project);
    setEditImpact(project.impact);
    setEditDifficulty(project.difficulty);
    setEditStatus(project.status);
    setEditObservations(project.statusObservations ?? "");
  }, []);

  const handleSave = useCallback(() => {
    if (!editingProject) return;

    // Validate observations for Suspendido/Cancelado
    if ((editStatus === "suspendido" || editStatus === "cancelado") && !editObservations.trim()) {
      Alert.alert(
        "Observaciones requeridas",
        `Para el estado "${STATUS_CONFIG[editStatus].label}" es obligatorio agregar observaciones.`
      );
      return;
    }

    const changes: string[] = [];
    if (editImpact !== editingProject.impact) changes.push(`Impacto: ${editingProject.impact} → ${editImpact}`);
    if (editDifficulty !== editingProject.difficulty) changes.push(`Dificultad: ${editingProject.difficulty} → ${editDifficulty}`);
    if (editStatus !== editingProject.status) changes.push(`Estado: ${STATUS_CONFIG[editingProject.status].label} → ${STATUS_CONFIG[editStatus].label}`);

    const notificationMessage =
      changes.length > 0
        ? `El administrador modificó tu proyecto "${editingProject.name}": ${changes.join(", ")}`
        : undefined;

    updateMutation.mutate({
      id: editingProject.id,
      impact: editImpact,
      difficulty: editDifficulty,
      status: editStatus,
      statusObservations: editObservations.trim() || null,
      notificationMessage,
    });
  }, [editingProject, editImpact, editDifficulty, editStatus, editObservations]);

  // Get unique areas for filter
  const areas = Array.from(new Set((allProjects as AdminProject[]).map((p) => p.areaName || p.processName).filter(Boolean)));

  const filteredProjects = (allProjects as AdminProject[]).filter((p) => {
    if (filterArea === "all") return true;
    return (p.areaName || p.processName) === filterArea;
  });

  const subtotalPreview = editImpact * editDifficulty;
  const subtotalColor =
    subtotalPreview >= 20 ? LIS_RED : subtotalPreview >= 12 ? LIS_ORANGE : subtotalPreview >= 6 ? LIS_YELLOW : LIS_GREEN;

  const requiresObservations = editStatus === "suspendido" || editStatus === "cancelado";

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Proyectos — Admin</Text>
          <Text style={styles.headerSub}>
            {(allProjects as AdminProject[]).length} proyectos en total
          </Text>
        </View>
      </View>

      {/* Area filter */}
      {areas.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterArea === "all" && styles.filterChipActive]}
            onPress={() => setFilterArea("all")}
          >
            <Text style={[styles.filterChipText, filterArea === "all" && styles.filterChipTextActive]}>
              Todas las áreas
            </Text>
          </TouchableOpacity>
          {areas.map((area) => (
            <TouchableOpacity
              key={area}
              style={[styles.filterChip, filterArea === area && styles.filterChipActive]}
              onPress={() => setFilterArea(area)}
            >
              <Text style={[styles.filterChipText, filterArea === area && styles.filterChipTextActive]}>
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LIS_BLUE} />
        </View>
      ) : filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin proyectos registrados</Text>
          <Text style={styles.emptyDesc}>
            Los líderes de área aún no han registrado proyectos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: project }) => {
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
                {/* Area/Leader info */}
                <View style={styles.cardMeta}>
                  <Text style={styles.cardArea}>{project.areaName || project.processName || "Sin área"}</Text>
                  <Text style={styles.cardLeader}>👤 {project.leaderName || project.leaderEmail || "Sin asignar"}</Text>
                </View>

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

                <Text style={styles.cardDescription} numberOfLines={2}>
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
                    <Text style={styles.obsLabel}>Obs: </Text>
                    <Text style={styles.obsText}>{project.statusObservations}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEdit(project)}
                >
                  <Text style={styles.editBtnText}>✏️ Editar calificación y estado</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editingProject} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Editar Proyecto</Text>
              {editingProject && (
                <>
                  <Text style={styles.modalProjectName}>{editingProject.name}</Text>
                  <Text style={styles.modalArea}>
                    {editingProject.areaName || editingProject.processName} — {editingProject.leaderName}
                  </Text>

                  <Text style={styles.fieldLabel}>
                    Impacto: <Text style={{ color: LIS_RED, fontWeight: "700" }}>{editImpact}</Text> — {IMPACT_LABELS[editImpact]}
                  </Text>
                  <RatingSelector value={editImpact} onChange={setEditImpact} color={LIS_RED} />

                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    Dificultad: <Text style={{ color: LIS_BLUE, fontWeight: "700" }}>{editDifficulty}</Text> — {DIFFICULTY_LABELS[editDifficulty]}
                  </Text>
                  <RatingSelector value={editDifficulty} onChange={setEditDifficulty} color={LIS_BLUE} />

                  <View style={[styles.scorePreview, { borderColor: subtotalColor }]}>
                    <Text style={styles.scorePreviewLabel}>Score</Text>
                    <Text style={[styles.scorePreviewValue, { color: subtotalColor }]}>
                      {editImpact} × {editDifficulty} = {subtotalPreview}
                    </Text>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Estado del Proyecto</Text>
                  <TouchableOpacity
                    style={styles.statusSelector}
                    onPress={() => setShowStatusModal(true)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: STATUS_CONFIG[editStatus].color }]} />
                    <Text style={styles.statusSelectorText}>{STATUS_CONFIG[editStatus].label}</Text>
                    <Text style={styles.statusSelectorArrow}>▼</Text>
                  </TouchableOpacity>

                  {requiresObservations && (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: 16, color: LIS_RED }]}>
                        Observaciones * (requerido para {STATUS_CONFIG[editStatus].label})
                      </Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editObservations}
                        onChangeText={setEditObservations}
                        placeholder="Explica el motivo del cambio de estado..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </>
                  )}

                  {!requiresObservations && (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                        Observaciones (opcional)
                      </Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editObservations}
                        onChangeText={setEditObservations}
                        placeholder="Notas adicionales sobre el cambio..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </>
                  )}

                  <View style={styles.notifNote}>
                    <Text style={styles.notifNoteText}>
                      💬 El líder del área recibirá una notificación en la app sobre los cambios realizados.
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setEditingProject(null)}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                      onPress={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status picker modal */}
      <Modal visible={showStatusModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.statusModalOverlay}
          onPress={() => setShowStatusModal(false)}
          activeOpacity={1}
        >
          <View style={styles.statusModalContent}>
            <Text style={styles.statusModalTitle}>Seleccionar Estado</Text>
            {STATUS_LIST.map((status) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    editStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => {
                    setEditStatus(status);
                    setShowStatusModal(false);
                  }}
                >
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={styles.statusOptionText}>{cfg.label}</Text>
                  {editStatus === status && <Text style={styles.statusOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
  filterScroll: {
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: LIS_BLUE,
    borderColor: LIS_BLUE,
  },
  filterChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "700",
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
  },
  listContent: {
    padding: 16,
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
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardArea: {
    fontSize: 12,
    fontWeight: "700",
    color: LIS_BLUE,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardLeader: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
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
    padding: 10,
    marginBottom: 8,
  },
  scoreItem: {
    alignItems: "center",
    flex: 1,
  },
  scoreLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "700",
    color: LIS_BLUE,
  },
  scoreSubLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 1,
  },
  scoreMult: {
    fontSize: 18,
    color: "#9CA3AF",
    fontWeight: "300",
    paddingHorizontal: 4,
  },
  scoreTotal: {
    alignItems: "center",
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 6,
  },
  scoreTotalLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 1,
  },
  scoreTotalValue: {
    fontSize: 20,
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
  editBtn: {
    backgroundColor: LIS_BLUE,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  editBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
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
    marginBottom: 4,
  },
  modalProjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  modalArea: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: LIS_BLUE,
    marginBottom: 8,
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
    padding: 12,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#FAFAFA",
  },
  scorePreviewLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  scorePreviewValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statusSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusSelectorText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  statusSelectorArrow: {
    fontSize: 12,
    color: "#6B7280",
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
  notifNote: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  notifNoteText: {
    fontSize: 12,
    color: LIS_BLUE,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
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
  // Status picker modal
  statusModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 320,
  },
  statusModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: LIS_BLUE,
    marginBottom: 16,
    textAlign: "center",
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  statusOptionSelected: {
    backgroundColor: "#F0F4FF",
  },
  statusOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  statusOptionCheck: {
    fontSize: 16,
    color: LIS_BLUE,
    fontWeight: "700",
  },
});
