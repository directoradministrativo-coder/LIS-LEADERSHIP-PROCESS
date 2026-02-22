import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionFilter = "all" | "delete" | "update" | "create";
type ModuleFilter =
  | "all"
  | "orgHierarchies"
  | "orgCollaborators"
  | "kpis"
  | "processInteractions"
  | "projects";

interface AuditEntry {
  id: number;
  tableName: string;
  recordId: number;
  action: "create" | "update" | "delete";
  oldData: string | null;
  newData: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  processId: number | null;
  processName: string | null;
  description: string | null;
  isRestored: boolean;
  createdAt: string | Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  orgHierarchies: "Organigrama",
  orgCollaborators: "Colaboradores",
  kpis: "KPIs",
  processInteractions: "Proveedores/Clientes",
  projects: "Proyectos",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Creación", color: "#22C55E" },
  update: { label: "Modificación", color: "#F59E0B" },
  delete: { label: "Eliminación", color: "#EF4444" },
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  entry,
  visible,
  onClose,
  onRestore,
  restoring,
}: {
  entry: AuditEntry | null;
  visible: boolean;
  onClose: () => void;
  onRestore: (id: number) => void;
  restoring: boolean;
}) {
  const colors = useColors();
  if (!entry) return null;

  const canRestore = entry.action === "delete" && !entry.isRestored;
  const moduleLabel = MODULE_LABELS[entry.tableName] ?? entry.tableName;
  const actionInfo = ACTION_LABELS[entry.action] ?? { label: entry.action, color: "#687076" };

  let parsedOld: any = null;
  try {
    if (entry.oldData) parsedOld = JSON.parse(entry.oldData);
  } catch {}

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Detalle del Registro
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.muted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Meta info */}
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Módulo</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{moduleLabel}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Acción</Text>
              <View style={[styles.actionBadge, { backgroundColor: actionInfo.color + "20" }]}>
                <Text style={{ color: actionInfo.color, fontWeight: "600", fontSize: 13 }}>
                  {actionInfo.label}
                </Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Usuario</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {entry.userName ?? "Desconocido"}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Área/Proceso</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {entry.processName ?? "—"}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Fecha</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(entry.createdAt)}
              </Text>
            </View>

            {/* Description */}
            {entry.description ? (
              <View style={[styles.descBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.descText, { color: colors.foreground }]}>{entry.description}</Text>
              </View>
            ) : null}

            {/* Snapshot preview */}
            {parsedOld && entry.action === "delete" && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  Datos del registro eliminado
                </Text>
                <View style={[styles.snapshotBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {Object.entries(
                    typeof parsedOld === "object" && !Array.isArray(parsedOld) && parsedOld.hierarchy
                      ? parsedOld.hierarchy
                      : typeof parsedOld === "object" && !Array.isArray(parsedOld) && parsedOld.collaborator
                      ? parsedOld.collaborator
                      : typeof parsedOld === "object" && !Array.isArray(parsedOld) && parsedOld.interaction
                      ? parsedOld.interaction
                      : parsedOld
                  )
                    .filter(([k]) => !["id", "processId", "hierarchyId", "collaboratorId", "interactionId", "createdAt", "updatedAt"].includes(k))
                    .map(([key, value]) => (
                      <View key={key} style={styles.snapshotRow}>
                        <Text style={[styles.snapshotKey, { color: colors.muted }]}>{key}:</Text>
                        <Text style={[styles.snapshotVal, { color: colors.foreground }]}>
                          {String(value ?? "—")}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {entry.isRestored && (
              <View style={[styles.restoredBadge, { backgroundColor: "#22C55E20" }]}>
                <Text style={{ color: "#22C55E", fontWeight: "600" }}>✓ Ya restaurado</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>Cerrar</Text>
            </TouchableOpacity>
            {canRestore && (
              <TouchableOpacity
                style={[styles.restoreBtn, restoring && { opacity: 0.6 }]}
                onPress={() => onRestore(entry.id)}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>↩ Restaurar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminHistorialScreen() {
  const colors = useColors();
  const { user } = useAuth();

  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Only admins can access this screen
  const userRole = (user as any)?.role;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text style={{ color: colors.error, fontSize: 16, textAlign: "center" }}>
          Acceso restringido. Solo administradores pueden ver el historial.
        </Text>
      </ScreenContainer>
    );
  }

  const queryInput = {
    tableName: moduleFilter !== "all" ? moduleFilter : undefined,
    action: actionFilter !== "all" ? (actionFilter as "create" | "update" | "delete") : undefined,
    limit: 100,
  };

  const { data, isLoading, refetch } = trpc.audit.list.useQuery(queryInput);
  const restoreMutation = trpc.audit.restore.useMutation({
    onSuccess: () => {
      Alert.alert("Restaurado", "El registro fue restaurado exitosamente.");
      setDetailVisible(false);
      refetch();
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "No se pudo restaurar el registro.");
    },
  });

  const handleRestore = useCallback(
    (id: number) => {
      Alert.alert(
        "Confirmar restauración",
        "¿Está seguro de que desea restaurar este registro? Se volverá a crear en el sistema.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Restaurar",
            style: "default",
            onPress: () => restoreMutation.mutate({ id }),
          },
        ]
      );
    },
    [restoreMutation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const logs: AuditEntry[] = (data?.logs ?? []) as AuditEntry[];
  const total = data?.total ?? 0;

  const renderItem = ({ item }: { item: AuditEntry }) => {
    const actionInfo = ACTION_LABELS[item.action] ?? { label: item.action, color: "#687076" };
    const moduleLabel = MODULE_LABELS[item.tableName] ?? item.tableName;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: item.action === "delete" && !item.isRestored ? "#EF444430" : colors.border,
            borderLeftColor: actionInfo.color,
          },
        ]}
        onPress={() => {
          setSelectedEntry(item);
          setDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.actionBadge, { backgroundColor: actionInfo.color + "20" }]}>
            <Text style={{ color: actionInfo.color, fontWeight: "700", fontSize: 11 }}>
              {actionInfo.label.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.cardModule, { color: colors.muted }]}>{moduleLabel}</Text>
          {item.isRestored && (
            <View style={[styles.restoredSmall, { backgroundColor: "#22C55E20" }]}>
              <Text style={{ color: "#22C55E", fontSize: 10, fontWeight: "600" }}>RESTAURADO</Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardDesc, { color: colors.foreground }]} numberOfLines={2}>
          {item.description ?? `${moduleLabel} #${item.recordId}`}
        </Text>

        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: colors.muted }]}>
            {item.userName ?? "Desconocido"}
          </Text>
          <Text style={[styles.cardMetaText, { color: colors.muted }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Historial de Cambios
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Module filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {(["all", "orgHierarchies", "orgCollaborators", "kpis", "processInteractions", "projects"] as ModuleFilter[]).map(
          (mod) => (
            <TouchableOpacity
              key={mod}
              style={[
                styles.filterChip,
                {
                  backgroundColor: moduleFilter === mod ? colors.primary : colors.surface,
                  borderColor: moduleFilter === mod ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setModuleFilter(mod)}
            >
              <Text
                style={{
                  color: moduleFilter === mod ? "#fff" : colors.foreground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {mod === "all" ? "Todos" : MODULE_LABELS[mod]}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* Action filter */}
      <View style={[styles.actionFilterRow, { borderBottomColor: colors.border }]}>
        {(["all", "delete", "update", "create"] as ActionFilter[]).map((act) => {
          const info = act === "all" ? { label: "Todas", color: colors.primary } : ACTION_LABELS[act];
          return (
            <TouchableOpacity
              key={act}
              style={[
                styles.actionFilterBtn,
                {
                  backgroundColor: actionFilter === act ? info.color + "20" : "transparent",
                  borderColor: actionFilter === act ? info.color : colors.border,
                },
              ]}
              onPress={() => setActionFilter(act)}
            >
              <Text style={{ color: actionFilter === act ? info.color : colors.muted, fontSize: 12, fontWeight: "600" }}>
                {act === "all" ? "Todas" : ACTION_LABELS[act].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Cargando historial...</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin registros</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No hay eventos de auditoría con los filtros seleccionados.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Detail Modal */}
      <DetailModal
        entry={selectedEntry}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onRestore={handleRestore}
        restoring={restoreMutation.isPending}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  filterRow: {
    borderBottomWidth: 0.5,
    paddingVertical: 10,
    maxHeight: 52,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  actionFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardModule: { fontSize: 12, flex: 1 },
  restoredSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDesc: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMetaText: { fontSize: 11 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  loadingText: { marginTop: 8, fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  closeBtn: { padding: 4 },
  modalBody: { padding: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "500", flex: 2, textAlign: "right" },
  descBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  descText: { fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  snapshotBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  snapshotRow: { flexDirection: "row", gap: 8 },
  snapshotKey: { fontSize: 12, width: 100 },
  snapshotVal: { fontSize: 12, flex: 1 },
  restoredBadge: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 0.5,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  restoreBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
});
