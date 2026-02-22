import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useLisRole } from "./_layout";

const LIS_RED = "#E63946";
const LIS_BLUE = "#1D3557";
const LIS_YELLOW = "#F4D35E";
const LIS_GREEN = "#52B788";
const LIS_ORANGE = "#F4A261";

const MODULE_LABELS: Record<string, string> = {
  organigrama: "Organigrama",
  kpis: "KPIs",
  dofa: "DOFA",
  proveedores: "Proveedores",
  clientes: "Clientes",
  proyectos: "Proyectos",
};

const ROLE_LABELS: Record<string, string> = {
  user: "Usuario",
  admin: "Admin",
  superadmin: "SuperAdmin",
};

interface ProgressEntry {
  id: number;
  name: string;
  email: string;
  areaName: string;
  role: string;
  isEnrolled: boolean;
  organigrama: boolean;
  kpis: boolean;
  dofa: boolean;
  proveedores: boolean;
  clientes: boolean;
  proyectos: boolean;
  completedCount: number;
  totalCount: number;
  lastUpdated: Date | null;
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const color = pct === 100 ? LIS_GREEN : pct >= 50 ? LIS_YELLOW : pct > 0 ? LIS_ORANGE : "#E5E7EB";
  return (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function ModuleDots({ entry }: { entry: ProgressEntry }) {
  const modules = ["organigrama", "kpis", "dofa", "proveedores", "clientes", "proyectos"] as const;
  return (
    <View style={styles.moduleDots}>
      {modules.map((m) => (
        <View
          key={m}
          style={[
            styles.moduleDot,
            { backgroundColor: entry[m] ? LIS_GREEN : "#E5E7EB" },
          ]}
        />
      ))}
    </View>
  );
}

function UserProgressView() {
  const { data: myProgress, isLoading } = trpc.progress.myProgress.useQuery();
  const modules = ["organigrama", "kpis", "dofa", "proveedores", "clientes", "proyectos"] as const;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={LIS_BLUE} />
      </View>
    );
  }

  if (!myProgress) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay datos de progreso aún. Comienza a diligenciar los módulos.</Text>
      </View>
    );
  }

  const pct = Math.round((myProgress.completedCount / myProgress.totalCount) * 100);
  const pctColor = pct === 100 ? LIS_GREEN : pct >= 50 ? LIS_YELLOW : pct > 0 ? LIS_ORANGE : LIS_RED;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={[styles.summaryCard, { borderTopColor: LIS_BLUE, marginBottom: 16 }]}>
        <Text style={styles.summaryLabel}>Proceso</Text>
        <Text style={[styles.summaryValue, { fontSize: 18 }]}>{myProgress.processName || "Sin nombre"}</Text>
        {myProgress.areaName ? <Text style={styles.summaryLabel}>{myProgress.areaName}</Text> : null}
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: LIS_BLUE }]}>
          <Text style={styles.summaryValue}>{myProgress.completedCount}</Text>
          <Text style={styles.summaryLabel}>Completados</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: LIS_GREEN }]}>
          <Text style={[styles.summaryValue, { color: pctColor }]}>{pct}%</Text>
          <Text style={styles.summaryLabel}>Progreso</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: LIS_YELLOW }]}>
          <Text style={styles.summaryValue}>{myProgress.totalCount - myProgress.completedCount}</Text>
          <Text style={styles.summaryLabel}>Pendientes</Text>
        </View>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Módulo</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Estado</Text>
        </View>
        {modules.map((m, idx) => (
          <View key={m} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
            <Text style={[styles.tableAreaName, { flex: 2 }]}>{MODULE_LABELS[m]}</Text>
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={[styles.moduleDot, { width: 20, height: 20, borderRadius: 10, backgroundColor: myProgress[m] ? LIS_GREEN : "#E5E7EB" }]} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function AdminProgresoScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  const { data: progressList = [], isLoading, refetch } = trpc.admin.getConsolidatedProgress.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: deadlineData, refetch: refetchDeadline } = trpc.config.getDeadline.useQuery();

  const setDeadlineMutation = trpc.config.setDeadline.useMutation({
    onSuccess: () => {
      refetchDeadline();
      setShowDeadlineModal(false);
      Alert.alert("Éxito", "Fecha límite actualizada correctamente.");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleSetDeadline = () => {
    if (!deadlineInput.trim()) {
      Alert.alert("Error", "Ingresa una fecha válida.");
      return;
    }
    setDeadlineMutation.mutate({ deadline: deadlineInput });
  };

  const openDeadlineModal = () => {
    setDeadlineInput(deadlineData?.deadline ?? "");
    setShowDeadlineModal(true);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDeadline = (deadline: string | null | undefined) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const deadlineDate = formatDeadline(deadlineData?.deadline);
  const now = new Date();
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const totalUsers = (progressList as ProgressEntry[]).length;
  const completedUsers = (progressList as ProgressEntry[]).filter((e) => e.completedCount === 6).length;
  const avgProgress =
    totalUsers > 0
      ? Math.round(
          (progressList as ProgressEntry[]).reduce((sum, e) => sum + e.completedCount, 0) /
            totalUsers
        )
      : 0;

  // While role is still loading, show spinner to avoid flicker
  if (lisRole === null) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={LIS_BLUE} />
        </View>
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mi Progreso</Text>
            <Text style={styles.headerSub}>Estado de tus módulos</Text>
          </View>
        </View>
        <UserProgressView />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Progreso Consolidado</Text>
          <Text style={styles.headerSub}>{totalUsers} líderes de área</Text>
        </View>
        <TouchableOpacity style={styles.deadlineBtn} onPress={openDeadlineModal}>
          <Text style={styles.deadlineBtnText}>📅 Fecha Límite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: LIS_BLUE }]}>
            <Text style={styles.summaryValue}>{totalUsers}</Text>
            <Text style={styles.summaryLabel}>Total Usuarios</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: LIS_GREEN }]}>
            <Text style={[styles.summaryValue, { color: LIS_GREEN }]}>{completedUsers}</Text>
            <Text style={styles.summaryLabel}>Completados</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: LIS_YELLOW }]}>
            <Text style={[styles.summaryValue, { color: LIS_BLUE }]}>{avgProgress}/6</Text>
            <Text style={styles.summaryLabel}>Promedio</Text>
          </View>
        </View>

        {/* Deadline status */}
        {deadlineDate && (
          <View
            style={[
              styles.deadlineCard,
              {
                backgroundColor:
                  daysLeft !== null && daysLeft < 0
                    ? "#FEE2E2"
                    : daysLeft !== null && daysLeft <= 3
                    ? "#FEE2E2"
                    : daysLeft !== null && daysLeft <= 7
                    ? "#FEF3C7"
                    : "#ECFDF5",
              },
            ]}
          >
            <Text style={styles.deadlineCardTitle}>Fecha Límite de Entrega</Text>
            <Text style={styles.deadlineCardDate}>
              {deadlineDate.toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
            {daysLeft !== null && (
              <Text
                style={[
                  styles.deadlineCardDays,
                  {
                    color:
                      daysLeft < 0
                        ? LIS_RED
                        : daysLeft <= 3
                        ? LIS_RED
                        : daysLeft <= 7
                        ? LIS_ORANGE
                        : LIS_GREEN,
                  },
                ]}
              >
                {daysLeft < 0
                  ? `Venció hace ${Math.abs(daysLeft)} días`
                  : daysLeft === 0
                  ? "¡Vence hoy!"
                  : `${daysLeft} días restantes`}
              </Text>
            )}
          </View>
        )}

        {/* Module legend */}
        <View style={styles.legendRow}>
          {Object.entries(MODULE_LABELS).map(([key, label]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: LIS_GREEN }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Progress table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={LIS_BLUE} />
          </View>
        ) : (progressList as ProgressEntry[]).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay usuarios registrados aún.</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Área / Líder</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Módulos</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Último</Text>
            </View>

            {(progressList as ProgressEntry[]).map((entry, index) => {
              const pct = Math.round((entry.completedCount / entry.totalCount) * 100);
              const pctColor = pct === 100 ? LIS_GREEN : pct >= 50 ? LIS_YELLOW : pct > 0 ? LIS_ORANGE : LIS_RED;

              return (
                <View
                  key={entry.id}
                  style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableAreaName} numberOfLines={1}>
                      {entry.areaName || "Sin área"}
                    </Text>
                    <Text style={styles.tableLeaderName} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <View style={styles.tableRoleBadge}>
                      <Text style={styles.tableRoleText}>{ROLE_LABELS[entry.role] ?? entry.role}</Text>
                      {!entry.isEnrolled && (
                        <Text style={styles.tableNotEnrolled}> · Sin acceso</Text>
                      )}
                    </View>
                    <ModuleDots entry={entry} />
                    <ProgressBar value={entry.completedCount} total={entry.totalCount} />
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={styles.tableModuleCount}>
                      {entry.completedCount}/{entry.totalCount}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={[styles.tablePct, { color: pctColor }]}>{pct}%</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
                    <Text style={styles.tableDate}>{formatDate(entry.lastUpdated)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Deadline Modal */}
      <Modal visible={showDeadlineModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Fecha Límite</Text>
            <Text style={styles.modalDesc}>
              Establece la fecha límite para que los líderes completen el levantamiento de sus procesos.
            </Text>

            <Text style={styles.fieldLabel}>Fecha límite (ISO 8601)</Text>
            <TextInput
              style={styles.input}
              value={deadlineInput}
              onChangeText={setDeadlineInput}
              placeholder="Ej: 2026-03-31T23:59:00"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.fieldHint}>
              Formato: YYYY-MM-DDTHH:MM:SS (ej: 2026-03-31T23:59:00)
            </Text>

            {/* Quick date buttons */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Selección rápida</Text>
            <View style={styles.quickDates}>
              {[7, 14, 30, 60].map((days) => {
                const d = new Date();
                d.setDate(d.getDate() + days);
                const iso = d.toISOString().slice(0, 19);
                return (
                  <TouchableOpacity
                    key={days}
                    style={styles.quickDateBtn}
                    onPress={() => setDeadlineInput(iso)}
                  >
                    <Text style={styles.quickDateBtnText}>+{days}d</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeadlineModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, setDeadlineMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSetDeadline}
                disabled={setDeadlineMutation.isPending}
              >
                {setDeadlineMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  deadlineBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  deadlineBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: LIS_BLUE,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  deadlineCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  deadlineCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  deadlineCardDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  deadlineCardDays: {
    fontSize: 18,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#6B7280",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: LIS_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#FAFAFA",
  },
  tableAreaName: {
    fontSize: 13,
    fontWeight: "700",
    color: LIS_BLUE,
    marginBottom: 2,
  },
  tableLeaderName: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },
  tableRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  tableRoleText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  tableNotEnrolled: {
    fontSize: 10,
    color: LIS_RED,
  },
  moduleDots: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  moduleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  tableModuleCount: {
    fontSize: 16,
    fontWeight: "700",
    color: LIS_BLUE,
  },
  tablePct: {
    fontSize: 16,
    fontWeight: "800",
  },
  tableDate: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: LIS_BLUE,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: LIS_BLUE,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
    backgroundColor: "#FAFAFA",
  },
  quickDates: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  quickDateBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: LIS_BLUE,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickDateBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: LIS_BLUE,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
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
});
