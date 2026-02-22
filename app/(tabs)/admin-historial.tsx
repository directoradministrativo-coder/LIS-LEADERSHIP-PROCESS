import React, { useState, useCallback, useMemo } from "react";
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { useLisRole } from "./_layout";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionFilter = "all" | "delete" | "update" | "create";
type ModuleFilter =
  | "all"
  | "orgHierarchies"
  | "orgCollaborators"
  | "kpis"
  | "processInteractions"
  | "interactionTasks"
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
  interactionTasks: "Tareas de Interacción",
  projects: "Proyectos",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Creación", color: "#22C55E" },
  update: { label: "Modificación", color: "#F59E0B" },
  delete: { label: "Eliminación", color: "#EF4444" },
};

// Field labels for human-readable diff display
const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  objective: "Objetivo",
  frequency: "Frecuencia",
  formula: "Fórmula",
  responsible: "Responsable",
  position: "Cargo",
  impact: "Impacto",
  difficulty: "Dificultad",
  subtotal: "Subtotal",
  status: "Estado",
  statusObservations: "Observaciones",
  taskActivity: "Actividad",
  documentRoute: "Ruta Documento",
  responsibleRole: "Rol Responsable",
  ansCompliance: "Cumplimiento",
  description: "Descripción",
};

const IGNORED_FIELDS = new Set([
  "id", "processId", "hierarchyId", "collaboratorId", "interactionId",
  "createdAt", "updatedAt", "hasNotification", "notificationMessage",
  "adminModifiedAt", "functionsVisible", "isRestored",
]);

function computeDiff(oldData: any, newData: any): Array<{ field: string; label: string; before: string; after: string }> {
  if (!oldData || !newData || typeof oldData !== "object" || typeof newData !== "object") return [];
  const diffs: Array<{ field: string; label: string; before: string; after: string }> = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const before = String(oldData[key] ?? "—");
    const after = String(newData[key] ?? "—");
    if (before !== after) {
      diffs.push({
        field: key,
        label: FIELD_LABELS[key] ?? key,
        before,
        after,
      });
    }
  }
  return diffs;
}

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

function formatDateShort(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

// Validate YYYY-MM-DD format
function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
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

  const canRestore = !entry.isRestored && ["delete", "update", "create"].includes(entry.action);

  const restoreLabel = entry.action === "delete"
    ? "\u21a9 Recrear registro"
    : entry.action === "update"
    ? "\u21a9 Revertir cambio"
    : "\u21a9 Deshacer creaci\u00f3n";

  const restoreDescription = entry.action === "delete"
    ? "Se recrear\u00e1 el registro eliminado con los datos originales."
    : entry.action === "update"
    ? "Se revertir\u00e1n los campos al estado anterior al cambio."
    : "Se eliminar\u00e1 el registro que fue creado (deshacer creaci\u00f3n).";
  const moduleLabel = MODULE_LABELS[entry.tableName] ?? entry.tableName;
  const actionInfo = ACTION_LABELS[entry.action] ?? { label: entry.action, color: "#687076" };

  let parsedOld: any = null;
  let parsedNew: any = null;
  try { if (entry.oldData) parsedOld = JSON.parse(entry.oldData); } catch {}
  try { if (entry.newData) parsedNew = JSON.parse(entry.newData); } catch {}

  const diffs = entry.action === "update" ? computeDiff(parsedOld, parsedNew) : [];

  // For delete: extract the main object to display
  const snapshotObj = parsedOld
    ? (parsedOld.hierarchy ?? parsedOld.collaborator ?? parsedOld.interaction ?? parsedOld)
    : null;

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
            {[
              { label: "Módulo", value: moduleLabel },
              { label: "Usuario", value: entry.userName ?? "Desconocido" },
              { label: "Área/Proceso", value: entry.processName ?? "—" },
              { label: "Fecha", value: formatDate(entry.createdAt) },
            ].map(({ label, value }) => (
              <View key={label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
              </View>
            ))}

            {/* Action badge */}
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Acción</Text>
              <View style={[styles.actionBadge, { backgroundColor: actionInfo.color + "20" }]}>
                <Text style={{ color: actionInfo.color, fontWeight: "600", fontSize: 13 }}>
                  {actionInfo.label}
                </Text>
              </View>
            </View>

            {/* Description */}
            {entry.description ? (
              <View style={[styles.descBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.descText, { color: colors.foreground }]}>{entry.description}</Text>
              </View>
            ) : null}

            {/* DIFF view for updates */}
            {entry.action === "update" && diffs.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  Campos modificados ({diffs.length})
                </Text>
                {diffs.map((diff) => (
                  <View key={diff.field} style={[styles.diffRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.diffField, { color: colors.muted }]}>{diff.label}</Text>
                    <View style={styles.diffValues}>
                      <View style={[styles.diffBefore, { backgroundColor: "#EF444415" }]}>
                        <Text style={{ color: "#EF4444", fontSize: 12 }}>Antes: {diff.before}</Text>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>→</Text>
                      <View style={[styles.diffAfter, { backgroundColor: "#22C55E15" }]}>
                        <Text style={{ color: "#22C55E", fontSize: 12 }}>Después: {diff.after}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {entry.action === "update" && diffs.length === 0 && parsedOld && (
              <View style={[styles.descBox, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.descText, { color: colors.muted }]}>
                  No se detectaron cambios en campos visibles.
                </Text>
              </View>
            )}

            {/* Snapshot for deletes */}
            {entry.action === "delete" && snapshotObj && typeof snapshotObj === "object" && !Array.isArray(snapshotObj) && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                  Datos del registro eliminado
                </Text>
                <View style={[styles.snapshotBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {Object.entries(snapshotObj)
                    .filter(([k]) => !IGNORED_FIELDS.has(k))
                    .map(([key, value]) => (
                      <View key={key} style={styles.snapshotRow}>
                        <Text style={[styles.snapshotKey, { color: colors.muted }]}>
                          {FIELD_LABELS[key] ?? key}:
                        </Text>
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
          {canRestore && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ color: "#F59E0B", fontSize: 12, textAlign: "center", lineHeight: 17 }}>
                ⚠️ {restoreDescription}
              </Text>
            </View>
          )}
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
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{restoreLabel}</Text>
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

const PAGE_SIZE = 50;

export default function AdminHistorialScreen() {
  const colors = useColors();
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<"from" | "to" | null>(null);
  const [tempDateInput, setTempDateInput] = useState("");
  const [dateInputError, setDateInputError] = useState("");

  const queryInput = {
    tableName: moduleFilter !== "all" ? moduleFilter : undefined,
    action: actionFilter !== "all" ? (actionFilter as "create" | "update" | "delete") : undefined,
    processName: areaFilter !== "all" ? areaFilter : undefined,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    limit: 500,
  };

  const { data, isLoading, refetch } = trpc.audit.list.useQuery(queryInput, { enabled: isAdmin });
  const { data: processNames } = trpc.audit.listProcessNames.useQuery(undefined, { enabled: isAdmin });

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
      const entry = selectedEntry;
      const actionMsg = entry?.action === "delete"
        ? "Se recrear\u00e1 el registro eliminado con los datos originales."
        : entry?.action === "update"
        ? "Se revertir\u00e1n los campos al estado anterior al cambio."
        : "Se eliminar\u00e1 el registro que fue creado (deshacer creaci\u00f3n).";
      const btnLabel = entry?.action === "delete"
        ? "Recrear"
        : entry?.action === "update"
        ? "Revertir"
        : "Deshacer";
      Alert.alert(
        "Confirmar restauraci\u00f3n",
        actionMsg,
        [
          { text: "Cancelar", style: "cancel" },
          { text: btnLabel, style: "destructive", onPress: () => restoreMutation.mutate({ id }) },
        ]
      );
    },
    [restoreMutation, selectedEntry]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Access guard using LIS role
  if (!isAdmin && lisRole !== null) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text style={{ color: "#EF4444", fontSize: 16, textAlign: "center" }}>
          Acceso restringido. Solo administradores pueden ver el historial.
        </Text>
      </ScreenContainer>
    );
  }

  const allLogs: AuditEntry[] = (data?.logs ?? []) as AuditEntry[];
  const total = data?.total ?? allLogs.length;
  const logs = allLogs.slice(0, visibleCount);
  const hasMore = visibleCount < allLogs.length;
  const areas: string[] = processNames ?? [];

  const renderItem = ({ item }: { item: AuditEntry }) => {
    const actionInfo = ACTION_LABELS[item.action] ?? { label: item.action, color: "#687076" };
    const moduleLabel = MODULE_LABELS[item.tableName] ?? item.tableName;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: !item.isRestored ? actionInfo.color + "30" : colors.border,
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
            <Text style={{ color: actionInfo.color, fontWeight: "700", fontSize: 10 }}>
              {actionInfo.label.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.cardModule, { color: colors.muted }]}>{moduleLabel}</Text>
          {item.processName ? (
            <Text style={[styles.cardArea, { color: colors.primary }]} numberOfLines={1}>
              {item.processName}
            </Text>
          ) : null}
          {item.isRestored && (
            <View style={[styles.restoredSmall, { backgroundColor: "#22C55E20" }]}>
              <Text style={{ color: "#22C55E", fontSize: 10, fontWeight: "600" }}>REST.</Text>
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
            {total} registro{total !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Module filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
      >
        {(["all", "orgHierarchies", "orgCollaborators", "kpis", "processInteractions", "interactionTasks", "projects"] as ModuleFilter[]).map(
          (mod) => (
            <TouchableOpacity
              key={mod}
              style={[
                styles.filterChip,
                {
                  backgroundColor: moduleFilter === mod ? "#1B4F9B" : colors.surface,
                  borderColor: moduleFilter === mod ? "#1B4F9B" : colors.border,
                },
              ]}
              onPress={() => setModuleFilter(mod)}
            >
              <Text style={{ color: moduleFilter === mod ? "#fff" : colors.foreground, fontSize: 11, fontWeight: "600" }}>
                {mod === "all" ? "Todos" : MODULE_LABELS[mod]}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* Action + Area filters row */}
      <View style={[styles.secondFilterRow, { borderBottomColor: colors.border }]}>
        {/* Action filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
          {(["all", "delete", "update", "create"] as ActionFilter[]).map((act) => {
            const info = act === "all" ? { label: "Todas", color: "#1B4F9B" } : ACTION_LABELS[act];
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
                <Text style={{ color: actionFilter === act ? info.color : colors.muted, fontSize: 11, fontWeight: "600" }}>
                  {act === "all" ? "Todas" : ACTION_LABELS[act].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Area filter button */}
        <TouchableOpacity
          style={[styles.areaBtn, { borderColor: areaFilter !== "all" ? "#1B4F9B" : colors.border, backgroundColor: areaFilter !== "all" ? "#1B4F9B15" : "transparent" }]}
          onPress={() => setAreaPickerVisible(true)}
        >
          <Text style={{ color: areaFilter !== "all" ? "#1B4F9B" : colors.muted, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
            {areaFilter !== "all" ? areaFilter : "Área ▾"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date range filter row */}
      <View style={[styles.dateFilterRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.datePill, { borderColor: dateFrom ? "#1B4F9B" : colors.border, backgroundColor: dateFrom ? "#1B4F9B15" : "transparent" }]}
          onPress={() => { setTempDateInput(dateFrom ?? ""); setDateInputError(""); setDatePickerMode("from"); }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: dateFrom ? "#1B4F9B" : colors.muted }}>
            {dateFrom ? `Desde: ${formatDateShort(dateFrom)}` : "Desde ▾"}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontSize: 12, marginHorizontal: 4 }}>—</Text>
        <TouchableOpacity
          style={[styles.datePill, { borderColor: dateTo ? "#1B4F9B" : colors.border, backgroundColor: dateTo ? "#1B4F9B15" : "transparent" }]}
          onPress={() => { setTempDateInput(dateTo ?? ""); setDateInputError(""); setDatePickerMode("to"); }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: dateTo ? "#1B4F9B" : colors.muted }}>
            {dateTo ? `Hasta: ${formatDateShort(dateTo)}` : "Hasta ▾"}
          </Text>
        </TouchableOpacity>
        {(dateFrom || dateTo) && (
          <TouchableOpacity
            style={[styles.datePill, { borderColor: "#EF4444", backgroundColor: "#FEF2F2", marginLeft: 4 }]}
            onPress={() => { setDateFrom(null); setDateTo(null); setVisibleCount(PAGE_SIZE); }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>✕ Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1B4F9B" size="large" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B4F9B" />
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(c => c + PAGE_SIZE)}
              >
                <Text style={styles.loadMoreText}>
                  Cargar más ({allLogs.length - visibleCount} restantes)
                </Text>
              </TouchableOpacity>
            ) : allLogs.length > 0 ? (
              <Text style={styles.endText}>
                Mostrando {allLogs.length} de {total} registros
              </Text>
            ) : null
          }
        />
      )}

      {/* Area picker modal */}
      <Modal visible={areaPickerVisible} animationType="slide" transparent onRequestClose={() => setAreaPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filtrar por Área</Text>
              <TouchableOpacity onPress={() => setAreaPickerVisible(false)}>
                <Text style={{ color: colors.muted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {["all", ...areas].map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border, backgroundColor: areaFilter === area ? "#1B4F9B10" : "transparent" },
                  ]}
                  onPress={() => {
                    setAreaFilter(area);
                    setAreaPickerVisible(false);
                  }}
                >
                  <Text style={{ color: areaFilter === area ? "#1B4F9B" : colors.foreground, fontWeight: areaFilter === area ? "700" : "400" }}>
                    {area === "all" ? "Todas las áreas" : area}
                  </Text>
                  {areaFilter === area && <Text style={{ color: "#1B4F9B" }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <DetailModal
        entry={selectedEntry}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onRestore={handleRestore}
        restoring={restoreMutation.isPending}
      />

      {/* Date input modal */}
      <Modal
        visible={datePickerMode !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setDatePickerMode(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, padding: 20 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {datePickerMode === "from" ? "Fecha Desde" : "Fecha Hasta"}
              </Text>
              <TouchableOpacity onPress={() => setDatePickerMode(null)}>
                <Text style={{ color: colors.muted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Ingrese la fecha en formato AAAA-MM-DD
              </Text>
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: dateInputError ? "#EF4444" : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                }}
              >
                <TextInput
                  value={tempDateInput}
                  onChangeText={(t: string) => { setTempDateInput(t); setDateInputError(""); }}
                  placeholder="2026-01-15"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={10}
                  style={{ color: colors.foreground, fontSize: 16, letterSpacing: 1 }}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!tempDateInput) {
                      if (datePickerMode === "from") setDateFrom(null);
                      else setDateTo(null);
                      setVisibleCount(PAGE_SIZE);
                      setDatePickerMode(null);
                      return;
                    }
                    if (!isValidDate(tempDateInput)) {
                      setDateInputError("Formato inválido. Use AAAA-MM-DD");
                      return;
                    }
                    if (datePickerMode === "from") setDateFrom(tempDateInput);
                    else setDateTo(tempDateInput);
                    setVisibleCount(PAGE_SIZE);
                    setDatePickerMode(null);
                  }}
                />
              </View>
              {dateInputError ? (
                <Text style={{ color: "#EF4444", fontSize: 12 }}>{dateInputError}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => setDatePickerMode(null)}
                >
                  <Text style={{ color: colors.muted, fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: "#EF4444", flex: 1 }]}
                  onPress={() => {
                    if (datePickerMode === "from") setDateFrom(null);
                    else setDateTo(null);
                    setVisibleCount(PAGE_SIZE);
                    setDatePickerMode(null);
                  }}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "600" }}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#1B4F9B", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                  onPress={() => {
                    if (!tempDateInput) {
                      if (datePickerMode === "from") setDateFrom(null);
                      else setDateTo(null);
                      setVisibleCount(PAGE_SIZE);
                      setDatePickerMode(null);
                      return;
                    }
                    if (!isValidDate(tempDateInput)) {
                      setDateInputError("Formato inválido. Use AAAA-MM-DD");
                      return;
                    }
                    if (datePickerMode === "from") setDateFrom(tempDateInput);
                    else setDateTo(tempDateInput);
                    setVisibleCount(PAGE_SIZE);
                    setDatePickerMode(null);
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  filterRow: {
    borderBottomWidth: 0.5,
    maxHeight: 52,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  secondFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  actionFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  areaBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 110,
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
    gap: 6,
    flexWrap: "wrap",
  },
  actionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardModule: { fontSize: 11 },
  cardArea: { fontSize: 11, fontWeight: "600", flex: 1 },
  restoredSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDesc: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
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
    maxHeight: "88%",
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  diffRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  diffField: { fontSize: 12, fontWeight: "600" },
  diffValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  diffBefore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  diffAfter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  snapshotBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  snapshotRow: { flexDirection: "row", gap: 8 },
  snapshotKey: { fontSize: 12, width: 110 },
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
  loadMoreBtn: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1B4F9B",
    alignItems: "center",
    backgroundColor: "#1B4F9B10",
  },
  loadMoreText: {
    color: "#1B4F9B",
    fontWeight: "700",
    fontSize: 14,
  },
  endText: {
    textAlign: "center",
    color: "#9BA1A6",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 6,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
});
