import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type Hierarchy = { id: number; name: string; level: number; parentId?: number | null };
type Collaborator = { id: number; hierarchyId: number; name: string; position?: string | null; functionsVisible: boolean };
type CollabFunction = { id: number; collaboratorId: number; description: string };

// ─── Organigrama Node Component ───────────────────────────────────────────────

function OrgNode({
  hierarchy,
  collaborators,
  allFunctions,
  depth = 0,
}: {
  hierarchy: Hierarchy;
  collaborators: Collaborator[];
  allFunctions: CollabFunction[];
  depth?: number;
}) {
  const nodeCollabs = collaborators.filter(c => c.hierarchyId === hierarchy.id);
  const [visibleFunctions, setVisibleFunctions] = useState<Record<number, boolean>>({});

  const toggleFunctions = (collabId: number) => {
    setVisibleFunctions(prev => ({ ...prev, [collabId]: !prev[collabId] }));
  };

  const levelColors: Record<number, { bg: string; border: string; text: string }> = {
    0: { bg: "#CC2229", border: "#A01B21", text: "#FFFFFF" },
    1: { bg: "#1B4F9B", border: "#153D7A", text: "#FFFFFF" },
    2: { bg: "#F5A623", border: "#D4891A", text: "#1A1A2E" },
    3: { bg: "#5CB85C", border: "#449D44", text: "#FFFFFF" },
    4: { bg: "#6C757D", border: "#545B62", text: "#FFFFFF" },
  };

  const colors = levelColors[Math.min(depth, 4)];

  return (
    <View style={[styles.nodeContainer, { marginLeft: depth * 16 }]}>
      {/* Hierarchy Header */}
      <View style={[styles.hierarchyHeader, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.hierarchyTitle, { color: colors.text }]}>{hierarchy.name}</Text>
      </View>

      {/* Collaborators */}
      {nodeCollabs.length === 0 ? (
        <View style={styles.emptyNode}>
          <Text style={styles.emptyNodeText}>Sin colaboradores registrados</Text>
        </View>
      ) : (
        nodeCollabs.map(collab => {
          const funcs = allFunctions.filter(f => f.collaboratorId === collab.id);
          const showFuncs = visibleFunctions[collab.id] ?? false;
          return (
            <View key={collab.id} style={styles.collabCard}>
              <View style={styles.collabHeader}>
                <View style={styles.collabAvatar}>
                  <Text style={styles.collabAvatarText}>
                    {collab.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.collabInfo}>
                  <Text style={styles.collabName}>{collab.name}</Text>
                  {collab.position && (
                    <Text style={styles.collabPosition}>{collab.position}</Text>
                  )}
                </View>
                {funcs.length > 0 && (
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: showFuncs ? colors.bg : "#F3F4F6" }]}
                    onPress={() => toggleFunctions(collab.id)}
                  >
                    <MaterialIcons
                      name={showFuncs ? "visibility-off" : "visibility"}
                      size={16}
                      color={showFuncs ? "#FFFFFF" : "#6B7280"}
                    />
                    <Text style={[styles.toggleBtnText, { color: showFuncs ? "#FFFFFF" : "#6B7280" }]}>
                      {funcs.length} func.
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Functions list */}
              {showFuncs && funcs.length > 0 && (
                <View style={styles.functionsContainer}>
                  {funcs.map((fn, idx) => (
                    <View key={fn.id} style={styles.functionItem}>
                      <View style={[styles.functionBullet, { backgroundColor: colors.bg }]} />
                      <Text style={styles.functionText}>{idx + 1}. {fn.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Admin: All Processes Org Chart ──────────────────────────────────────────

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Nivel 1 — Dirección", color: "#CC2229" },
  2: { label: "Nivel 2 — Gerencia", color: "#1B4F9B" },
  3: { label: "Nivel 3 — Coordinación", color: "#F5A623" },
  4: { label: "Nivel 4 — Análisis", color: "#5CB85C" },
  5: { label: "Nivel 5 — Auxiliar", color: "#6C757D" },
};

function AdminOrgView() {
  const allProcessesQuery = trpc.admin.getAllProcesses.useQuery();
  const [viewMode, setViewMode] = useState<"separado" | "integrado">("separado");
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [showProcessPicker, setShowProcessPicker] = useState(false);

  if (allProcessesQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.loadingText}>Cargando todos los procesos...</Text>
      </View>
    );
  }

  const processesData = allProcessesQuery.data ?? [];

  if (processesData.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="account-tree" size={48} color="#D1D5DB" />
        <Text style={styles.emptyStateTitle}>Sin procesos registrados</Text>
        <Text style={styles.emptyStateText}>Aún no hay líderes de área que hayan completado su organigrama.</Text>
      </View>
    );
  }

  // Filter by selected process (or show all)
  const filteredData = selectedProcessId
    ? processesData.filter((item: any) => item.process?.id === selectedProcessId)
    : processesData;

  // Build integrated view: group all hierarchies by level across filtered processes
  const byLevel = useMemo(() => {
    const map: Record<number, { processName: string; areaName: string; hierarchy: any; collaborators: any[] }[]> = {};
    for (const { process, hierarchies, collaborators } of filteredData) {
      for (const h of hierarchies) {
        if (!map[h.level]) map[h.level] = [];
        map[h.level].push({
          processName: process.processName ?? "",
          areaName: process.areaName ?? "",
          hierarchy: h,
          collaborators,
        });
      }
    }
    return map;
  }, [filteredData]);

  const levelKeys = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  const selectedProcessName = selectedProcessId
    ? (processesData.find((item: any) => item.process?.id === selectedProcessId) as any)?.process?.processName ?? "Proceso"
    : null;

  return (
    <View style={{ flex: 1 }}>
      {/* View Mode Toggle + Process Filter */}
      <View style={styles.viewModeBar}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === "separado" && styles.viewModeBtnActive]}
          onPress={() => setViewMode("separado")}
        >
          <MaterialIcons name="view-agenda" size={16} color={viewMode === "separado" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeBtnText, viewMode === "separado" && styles.viewModeBtnTextActive]}>
            Por Proceso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === "integrado" && styles.viewModeBtnActive]}
          onPress={() => setViewMode("integrado")}
        >
          <MaterialIcons name="layers" size={16} color={viewMode === "integrado" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeBtnText, viewMode === "integrado" && styles.viewModeBtnTextActive]}>
            Por Nivel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Process Filter Bar */}
      <View style={styles.filterBar}>
        <MaterialIcons name="filter-list" size={16} color="#6B7280" />
        <Text style={styles.filterLabel}>Filtrar:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedProcessId && styles.filterChipActive]}
            onPress={() => setSelectedProcessId(null)}
          >
            <Text style={[styles.filterChipText, !selectedProcessId && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {processesData.map((item: any) => {
            const pid = item.process?.id;
            const pname = item.process?.processName || item.process?.areaName || `Proceso ${pid}`;
            const isActive = selectedProcessId === pid;
            return (
              <TouchableOpacity
                key={pid}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedProcessId(isActive ? null : pid)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} numberOfLines={1}>{pname}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {viewMode === "separado" ? (
        <ScrollView style={styles.adminScrollView} showsVerticalScrollIndicator={false}>
          {filteredData.map(({ process, user, hierarchies, collaborators }: any) => {
            if (!process.processName || hierarchies.length === 0) return null;
            const sortedHierarchies = [...hierarchies].sort((a, b) => a.level - b.level);
            return (
              <View key={process.id} style={styles.processBlock}>
                <View style={styles.processBlockHeader}>
                  <View style={styles.processBlockIcon}>
                    <MaterialIcons name="business" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.processBlockTitle}>{process.processName}</Text>
                    {process.areaName && (
                      <Text style={styles.processBlockArea}>{process.areaName}</Text>
                    )}
                    {user && (
                      <Text style={styles.processBlockUser}>Líder: {user.name ?? user.email}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.processBlockContent}>
                  {sortedHierarchies.map(h => (
                    <OrgNode
                      key={h.id}
                      hierarchy={h}
                      collaborators={collaborators as Collaborator[]}
                      allFunctions={[]}
                      depth={h.level}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.adminScrollView} showsVerticalScrollIndicator={false}>
          {levelKeys.map(level => {
            const cfg = LEVEL_LABELS[level] ?? { label: `Nivel ${level}`, color: "#6C757D" };
            return (
              <View key={level} style={styles.levelBlock}>
                <View style={[styles.levelBlockHeader, { backgroundColor: cfg.color }]}>
                  <MaterialIcons name="layers" size={18} color="#FFFFFF" />
                  <Text style={styles.levelBlockTitle}>{cfg.label}</Text>
                  <View style={styles.levelCountBadge}>
                    <Text style={styles.levelCountText}>{byLevel[level].length} cargos</Text>
                  </View>
                </View>
                {byLevel[level].map((item, idx) => (
                  <View key={idx} style={styles.integratedRow}>
                    <View style={[styles.integratedProcessTag, { borderLeftColor: cfg.color }]}>
                      <Text style={styles.integratedProcessName} numberOfLines={1}>
                        {item.processName || item.areaName}
                      </Text>
                    </View>
                    <OrgNode
                      hierarchy={item.hierarchy}
                      collaborators={item.collaborators as Collaborator[]}
                      allFunctions={[]}
                      depth={0}
                    />
                  </View>
                ))}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── User: Own Process Org Chart ─────────────────────────────────────────────

function UserOrgView() {
  const hierarchiesQuery = trpc.hierarchy.list.useQuery();
  const collaboratorsQuery = trpc.collaborator.listAll.useQuery();
  const [allFunctions, setAllFunctions] = useState<CollabFunction[]>([]);
  const [functionsLoaded, setFunctionsLoaded] = useState(false);

  // Load all functions for all collaborators
  const collaborators = collaboratorsQuery.data ?? [];

  // We'll use a single query for each collaborator's functions
  // Since we can't call hooks conditionally, we'll fetch them all at once via a workaround
  const functionsQueries = trpc.useUtils();

  const loadAllFunctions = async () => {
    if (functionsLoaded || collaborators.length === 0) return;
    const allFuncs: CollabFunction[] = [];
    for (const collab of collaborators) {
      try {
        const funcs = await functionsQueries.collaboratorFunction.list.fetch({ collaboratorId: collab.id });
        allFuncs.push(...funcs);
      } catch {
        // ignore
      }
    }
    setAllFunctions(allFuncs);
    setFunctionsLoaded(true);
  };

  // Load functions when collaborators are available — in useEffect to avoid setState-during-render
  useEffect(() => {
    if (collaborators.length > 0 && !functionsLoaded) {
      void loadAllFunctions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborators.length, functionsLoaded]);

  const hierarchies = hierarchiesQuery.data ?? [];
  const sortedHierarchies = useMemo(() =>
    [...hierarchies].sort((a, b) => a.level - b.level),
    [hierarchies]
  );

  if (hierarchiesQuery.isLoading || collaboratorsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.loadingText}>Cargando organigrama...</Text>
      </View>
    );
  }

  if (hierarchies.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="account-tree" size={48} color="#D1D5DB" />
        <Text style={styles.emptyStateTitle}>Organigrama vacío</Text>
        <Text style={styles.emptyStateText}>
          Primero registra las jerarquías y colaboradores en el módulo de Organigrama.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.userScrollView} showsVerticalScrollIndicator={false}>
      {sortedHierarchies.map(h => (
        <OrgNode
          key={h.id}
          hierarchy={h}
          collaborators={collaborators as Collaborator[]}
          allFunctions={allFunctions}
          depth={h.level}
        />
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function OrganigramaVisualScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  return (
    <ScreenContainer containerClassName="bg-white">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.colorStrip}>
          <View style={[styles.colorBlock, { backgroundColor: "#CC2229" }]} />
          <View style={[styles.colorBlock, { backgroundColor: "#F5A623" }]} />
          <View style={[styles.colorBlock, { backgroundColor: "#5CB85C" }]} />
          <View style={[styles.colorBlock, { backgroundColor: "#1B4F9B" }]} />
        </View>
        <View style={styles.headerContent}>
          <MaterialIcons name="account-tree" size={24} color="#CC2229" />
          <Text style={styles.headerTitle}>
            {isAdmin ? "Organigramas de Todos los Procesos" : "Organigrama del Área"}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Vista Administrador</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { label: "Director", color: "#CC2229" },
          { label: "Gerente", color: "#1B4F9B" },
          { label: "Coordinador", color: "#F5A623" },
          { label: "Analista", color: "#5CB85C" },
          { label: "Auxiliar", color: "#6C757D" },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAdmin ? <AdminOrgView /> : <UserOrgView />}
      </View>
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    flex: 1,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B4F9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  userScrollView: {
    flex: 1,
    padding: 16,
  },
  adminScrollView: {
    flex: 1,
    padding: 16,
  },
  // Node styles
  nodeContainer: {
    marginBottom: 12,
  },
  hierarchyHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hierarchyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyNode: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    marginLeft: 8,
  },
  emptyNodeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  collabCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
    marginLeft: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  collabHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  collabAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1B4F9B",
    justifyContent: "center",
    alignItems: "center",
  },
  collabAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  collabInfo: {
    flex: 1,
  },
  collabName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  collabPosition: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  functionsContainer: {
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 10,
    gap: 4,
  },
  functionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  functionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  functionText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
    flex: 1,
  },
  // Admin styles
  processBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  processBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#1A1A2E",
    gap: 12,
  },
  processBlockIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#CC2229",
    justifyContent: "center",
    alignItems: "center",
  },
  processBlockTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  processBlockArea: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  processBlockUser: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  processBlockContent: {
    padding: 12,
  },
  // View mode toggle
  viewModeBar: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewModeBtnActive: {
    backgroundColor: "#1B4F9B",
    borderColor: "#1B4F9B",
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeBtnTextActive: {
    color: "#FFFFFF",
  },
  // Integrated view
  levelBlock: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  levelBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  levelBlockTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  levelCountBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelCountText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  integratedRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  integratedProcessTag: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderLeftWidth: 3,
    backgroundColor: "#F9FAFB",
  },
  integratedProcessName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: "#CC2229",
    borderColor: "#CC2229",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    maxWidth: 120,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
