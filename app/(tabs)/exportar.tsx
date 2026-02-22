import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { buildExcelWorkbook, buildConsolidatedExcelWorkbook, downloadExcel } from "@/lib/excel-export";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";

  const EXPORT_SECTIONS = [
  { key: "organigrama", label: "Organigrama del Área", icon: "👥", color: "#1B4F9B" },
  { key: "kpis", label: "KPIs del Proceso", icon: "📊", color: "#CC2229" },
  { key: "dofa", label: "Análisis DOFA", icon: "🔍", color: "#5CB85C" },
  { key: "proveedores", label: "Proveedores del Proceso", icon: "📦", color: "#F5A623" },
  { key: "clientes", label: "Clientes del Proceso", icon: "🤝", color: "#6366F1" },
  { key: "proyectos", label: "Proyectos del Área", icon: "🚀", color: "#7C3AED" },
];

export default function ExportarScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  const [isExporting, setIsExporting] = useState(false);
  const [exportingProcessId, setExportingProcessId] = useState<number | null>(null);
  const [exportMode, setExportMode] = useState<"individual" | "consolidated" | "selected">("individual");
  const [selectedProcessIds, setSelectedProcessIds] = useState<number[]>([]);

  // User queries
  const processQuery = trpc.process.getOrCreate.useQuery();
  const orgChartQuery = trpc.export.orgChart.useQuery();
  const kpisExportQuery = trpc.export.kpis.useQuery();
  const dofaExportQuery = trpc.export.dofa.useQuery();
  const interactionsExportQuery = trpc.export.interactions.useQuery();
  const projectsExportQuery = trpc.export.projects.useQuery();

  // Admin queries
  const allProcessesQuery = trpc.admin.getAllProcesses.useQuery(undefined, { enabled: isAdmin });
  const auditLogQuery = trpc.export.auditLog.useQuery(undefined, { enabled: isAdmin });

  const isLoading =
    processQuery.isLoading ||
    orgChartQuery.isLoading ||
    kpisExportQuery.isLoading ||
    dofaExportQuery.isLoading ||
    interactionsExportQuery.isLoading ||
    projectsExportQuery.isLoading;

  const process = processQuery.data;
  const orgData = orgChartQuery.data;
  const kpisData = kpisExportQuery.data;
  const dofaData = dofaExportQuery.data;
  const interactionsData = interactionsExportQuery.data;

  const projectsExportData = projectsExportQuery.data;

  const stats = {
    cargos: orgData?.hierarchies?.length ?? 0,
    colaboradores: orgData?.collaborators?.length ?? 0,
    kpis: kpisData?.kpis?.length ?? 0,
    debilidades: dofaData?.dofa?.debilidades?.length ?? 0,
    oportunidades: dofaData?.dofa?.oportunidades?.length ?? 0,
    fortalezas: dofaData?.dofa?.fortalezas?.length ?? 0,
    amenazas: dofaData?.dofa?.amenazas?.length ?? 0,
    proveedores: interactionsData?.interactions?.filter((i: any) => i.type === "proveedor")?.length ?? 0,
    clientes: interactionsData?.interactions?.filter((i: any) => i.type === "cliente")?.length ?? 0,
    proyectos: projectsExportData?.projects?.length ?? 0,
  };

  const totalItems = Object.values(stats).reduce((a, b) => a + b, 0);

  // getAllProcessesData returns [{process, user, hierarchies, collaborators, kpis, dofa, interactions}]
  // We flatten for easy access in the UI
  const allProcesses = (allProcessesQuery.data ?? []).map((item: any) => ({
    id: item.process?.id ?? item.id,
    processName: item.process?.processName ?? item.processName ?? "",
    areaName: item.process?.areaName ?? item.areaName ?? "",
    updatedAt: item.process?.updatedAt ?? item.updatedAt,
    responsibleName: item.user?.name ?? item.responsibleName ?? "",
    _raw: item,
  }));

  const toggleProcessSelection = (id: number) => {
    setSelectedProcessIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleExportSingleProcess = async (processId: number) => {
    setExportingProcessId(processId);
    try {
      const rawItem = (allProcessesQuery.data ?? []).find(
        (item: any) => (item.process?.id ?? item.id) === processId
      );
      if (!rawItem) {
        Alert.alert("Error", "No se encontraron datos para este proceso.");
        return;
      }
      const proc = rawItem.process ?? rawItem;
      const wb = buildExcelWorkbook(
        { process: proc, hierarchies: rawItem.hierarchies ?? [], collaborators: rawItem.collaborators ?? [], functions: rawItem.functions ?? [] },
        { process: proc, kpis: rawItem.kpis ?? [] },
        { process: proc, dofa: rawItem.dofa },
        { process: proc, interactions: rawItem.interactions ?? [] },
        { process: proc, projects: rawItem.projects ?? [] }
      );
      const pName = (proc.processName ?? "Proceso").replace(/\s+/g, "_");
      const filename = `LIS_Levantamiento_${pName}_${new Date().toISOString().split("T")[0]}.xlsx`;
      await downloadExcel(wb, filename);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el archivo Excel individual.");
      console.error(error);
    } finally {
      setExportingProcessId(null);
    }
  };

  const handleExportIndividual = async () => {
    if (!process?.processName) {
      Alert.alert("Proceso sin nombre", "Por favor, ingresa el nombre del proceso antes de exportar");
      return;
    }
    if (totalItems === 0) {
      Alert.alert("Sin datos", "No hay información registrada para exportar. Completa al menos un módulo.");
      return;
    }
    setIsExporting(true);
    try {
      const wb = buildExcelWorkbook(
        { process, hierarchies: orgData?.hierarchies ?? [], collaborators: orgData?.collaborators ?? [], functions: orgData?.functions ?? [] },
        { process, kpis: kpisData?.kpis ?? [] },
        { process, dofa: dofaData?.dofa },
        { process, interactions: interactionsData?.interactions ?? [] },
        { process, projects: projectsExportData?.projects ?? [] }
      );
      const filename = `LIS_Levantamiento_${process.processName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      await downloadExcel(wb, filename);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el archivo Excel. Intenta nuevamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAdmin = async () => {
    const targetIds = exportMode === "consolidated"
      ? allProcesses.map((p: any) => p.id)
      : selectedProcessIds;

    if (targetIds.length === 0) {
      Alert.alert("Sin procesos seleccionados", "Selecciona al menos un proceso para exportar.");
      return;
    }
    setIsExporting(true);
    try {
      // Filter selected processes from allProcessesQuery raw data
      const selectedData = (allProcessesQuery.data ?? [])
        .filter((item: any) => targetIds.includes(item.process?.id ?? item.id));

      if (selectedData.length === 0) {
        Alert.alert("Sin datos", "No se encontraron datos para los procesos seleccionados.");
        return;
      }

      // Build consolidated workbook with same structure as individual export
      const auditData = auditLogQuery.data ?? [];
      const wb = buildConsolidatedExcelWorkbook(selectedData, auditData.length > 0 ? auditData : undefined);

      const filename = `LIS_Consolidado_${exportMode === "consolidated" ? "Todos" : "Seleccion"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      await downloadExcel(wb, filename);
      Alert.alert("Éxito", `Archivo consolidado generado con ${selectedData.length} proceso(s) y 7 hojas de datos.`);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el archivo Excel consolidado.");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Exportar Reporte</Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin ? "Vista Administrador — Exportación consolidada disponible" : "Descarga el levantamiento completo en Excel"}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── ADMIN MODE SELECTOR ── */}
        {isAdmin && (
          <View style={styles.adminModeCard}>
            <Text style={styles.adminModeTitle}>Modo de Exportación</Text>
            <View style={styles.adminModeBtns}>
              <TouchableOpacity
                style={[styles.adminModeBtn, exportMode === "individual" && styles.adminModeBtnActive]}
                onPress={() => setExportMode("individual")}
              >
                <MaterialIcons name="person" size={18} color={exportMode === "individual" ? "#FFF" : "#6B7280"} />
                <Text style={[styles.adminModeBtnText, exportMode === "individual" && styles.adminModeBtnTextActive]}>
                  Mi Proceso
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminModeBtn, exportMode === "consolidated" && styles.adminModeBtnActive]}
                onPress={() => setExportMode("consolidated")}
              >
                <MaterialIcons name="group" size={18} color={exportMode === "consolidated" ? "#FFF" : "#6B7280"} />
                <Text style={[styles.adminModeBtnText, exportMode === "consolidated" && styles.adminModeBtnTextActive]}>
                  Todos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminModeBtn, exportMode === "selected" && styles.adminModeBtnActive]}
                onPress={() => setExportMode("selected")}
              >
                <MaterialIcons name="checklist" size={18} color={exportMode === "selected" ? "#FFF" : "#6B7280"} />
                <Text style={[styles.adminModeBtnText, exportMode === "selected" && styles.adminModeBtnTextActive]}>
                  Seleccionar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── ADMIN: PROCESS SELECTION ── */}
        {isAdmin && exportMode === "selected" && (
          <View style={styles.processSelectionCard}>
            <Text style={styles.processSelectionTitle}>
              Selecciona los procesos a exportar ({selectedProcessIds.length} seleccionados)
            </Text>
            {allProcessesQuery.isLoading ? (
              <ActivityIndicator color="#CC2229" style={{ marginTop: 12 }} />
            ) : allProcesses.length === 0 ? (
              <Text style={styles.noProcessesText}>No hay procesos registrados aún.</Text>
            ) : (
              allProcesses.map((p: any) => {
                const isSelected = selectedProcessIds.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.processSelectItem, isSelected && styles.processSelectItemActive]}
                    onPress={() => toggleProcessSelection(p.id)}
                  >
                    <View style={[styles.processSelectCheck, isSelected && styles.processSelectCheckActive]}>
                      {isSelected && <MaterialIcons name="check" size={14} color="#FFF" />}
                    </View>
                    <View style={styles.processSelectInfo}>
                      <Text style={styles.processSelectName}>{p.processName || "Sin nombre"}</Text>
                      {p.areaName && <Text style={styles.processSelectArea}>{p.areaName}</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.individualExportBtn}
                      onPress={(e) => { e.stopPropagation(); handleExportSingleProcess(p.id); }}
                      disabled={exportingProcessId === p.id}
                    >
                      {exportingProcessId === p.id ? (
                        <ActivityIndicator size="small" color="#CC2229" />
                      ) : (
                        <MaterialIcons name="file-download" size={20} color="#CC2229" />
                      )}
                    </TouchableOpacity>
                    <View style={[styles.processStatusDot, { backgroundColor: p.processName ? "#5CB85C" : "#F5A623" }]} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ── ADMIN: CONSOLIDATED SUMMARY ── */}
        {isAdmin && exportMode === "consolidated" && (
          <View style={styles.consolidatedCard}>
            <MaterialIcons name="info-outline" size={20} color="#1B4F9B" />
            <Text style={styles.consolidatedText}>
              Se exportarán <Text style={styles.consolidatedCount}>{allProcesses.length}</Text> proceso(s) registrados en el sistema en un archivo Excel consolidado.
            </Text>
          </View>
        )}

        {/* ── USER / INDIVIDUAL EXPORT ── */}
        {(!isAdmin || exportMode === "individual") && (
          <>
            {/* Process Info */}
            <View style={styles.processCard}>
              <Text style={styles.processLabel}>PROCESO</Text>
              {processQuery.isLoading ? (
                <ActivityIndicator color="#CC2229" />
              ) : (
                <Text style={styles.processName}>
                  {process?.processName ?? "Sin nombre definido"}
                </Text>
              )}
            </View>

            {/* Data Summary */}
            <Text style={styles.sectionTitle}>RESUMEN DE DATOS REGISTRADOS</Text>
            <View style={styles.summaryGrid}>
              <SummaryCard icon="👥" label="Cargos" value={stats.cargos} color="#1B4F9B" />
              <SummaryCard icon="🧑" label="Colaboradores" value={stats.colaboradores} color="#1B4F9B" />
              <SummaryCard icon="📊" label="KPIs" value={stats.kpis} color="#CC2229" />
              <SummaryCard icon="⚠️" label="Debilidades" value={stats.debilidades} color="#CC2229" />
              <SummaryCard icon="💡" label="Oportunidades" value={stats.oportunidades} color="#F5A623" />
              <SummaryCard icon="💪" label="Fortalezas" value={stats.fortalezas} color="#5CB85C" />
              <SummaryCard icon="🛡" label="Amenazas" value={stats.amenazas} color="#1B4F9B" />
              <SummaryCard icon="📦" label="Proveedores" value={stats.proveedores} color="#F5A623" />
              <SummaryCard icon="🤝" label="Clientes" value={stats.clientes} color="#6366F1" />
            </View>

            {/* Export Sections List */}
            <Text style={styles.sectionTitle}>HOJAS INCLUIDAS EN EL EXCEL</Text>
            <View style={styles.sheetsList}>
              <SheetItem icon="📋" label="Portada" description="Información general del proceso" />
              {EXPORT_SECTIONS.map(s => (
                <SheetItem key={s.key} icon={s.icon} label={s.label} description="Datos registrados en el módulo" color={s.color} />
              ))}
            </View>
          </>
        )}

        {/* ── EXPORT BUTTON ── */}
        <TouchableOpacity
          style={[styles.exportBtn, (isExporting || (exportMode === "individual" && isLoading)) && styles.exportBtnDisabled]}
          onPress={isAdmin && exportMode !== "individual" ? handleExportAdmin : handleExportIndividual}
          disabled={isExporting || (exportMode === "individual" && isLoading)}
        >
          {isExporting ? (
            <View style={styles.exportBtnContent}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.exportBtnText}>Generando Excel...</Text>
            </View>
          ) : (
            <View style={styles.exportBtnContent}>
              <Text style={styles.exportBtnIcon}>📥</Text>
              <Text style={styles.exportBtnText}>
                {exportMode === "consolidated"
                  ? `Descargar Consolidado (${allProcesses.length} procesos)`
                  : exportMode === "selected"
                  ? `Descargar Seleccionados (${selectedProcessIds.length})`
                  : "Descargar Excel Completo"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.exportNote}>
          {exportMode === "individual"
            ? "El archivo incluye todas las hojas con el levantamiento completo del proceso, listo para compartir o archivar."
            : "El archivo consolidado incluye las mismas 7 hojas (Portada, Organigrama, KPIs, DOFA, Proveedores, Clientes, Proyectos) con los datos de todos los procesos seleccionados."}
        </Text>

        {/* ── ADMIN: EXPORT AUDIT LOG ── */}
        {isAdmin && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>HISTORIAL DE CAMBIOS</Text>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: "#7C3AED", marginTop: 0 }, (isExporting || auditLogQuery.isLoading) && styles.exportBtnDisabled]}
              onPress={async () => {
                const auditData = auditLogQuery.data;
                if (!auditData || auditData.length === 0) {
                  Alert.alert("Sin datos", "No hay registros de auditoría para exportar.");
                  return;
                }
                setIsExporting(true);
                try {
                  const XLSX = require("xlsx-js-style");
                  const wb = XLSX.utils.book_new();
                  const moduleLabels: Record<string, string> = {
                    orgHierarchies: "Organigrama",
                    orgCollaborators: "Colaboradores",
                    kpis: "KPIs",
                    processInteractions: "Proveedores/Clientes",
                    interactionTasks: "Tareas de Interacción",
                    projects: "Proyectos",
                  };
                  const actionLabels: Record<string, string> = {
                    create: "Creación",
                    update: "Modificación",
                    delete: "Eliminación",
                  };
                  const rows: any[][] = [
                    ["HISTORIAL DE CAMBIOS — LIS", "", "", "", "", "", "", "", ""],
                    [`Exportado: ${new Date().toLocaleDateString("es-CO")}`, "", "", "", "", "", "", "", ""],
                    [""],
                    ["#", "Fecha", "Módulo", "Acción", "Descripción", "Usuario", "Email", "Área/Proceso", "Restaurado"],
                    ...auditData.map((e: any, i: number) => [
                      i + 1,
                      e.fecha,
                      moduleLabels[e.modulo] ?? e.modulo,
                      actionLabels[e.accion] ?? e.accion,
                      e.descripcion,
                      e.usuario,
                      e.email,
                      e.area,
                      e.restaurado,
                    ]),
                  ];
                  const ws = XLSX.utils.aoa_to_sheet(rows);
                  ws["!cols"] = [5, 20, 20, 14, 50, 25, 30, 25, 10].map(w => ({ wch: w }));
                  XLSX.utils.book_append_sheet(wb, ws, "Historial");
                  const filename = `LIS_Historial_${new Date().toISOString().split("T")[0]}.xlsx`;
                  await downloadExcel(wb, filename);
                } catch (e) {
                  Alert.alert("Error", "No se pudo generar el archivo de historial.");
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting || auditLogQuery.isLoading}
            >
              <View style={styles.exportBtnContent}>
                <Text style={styles.exportBtnIcon}>📋</Text>
                <Text style={styles.exportBtnText}>
                  Descargar Historial ({auditLogQuery.data?.length ?? 0} registros)
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.exportNote}>
              Incluye todos los cambios registrados: creaciones, modificaciones y eliminaciones de todos los módulos.
            </Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.summaryCard, value > 0 && { borderColor: color, borderWidth: 1.5 }]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={[styles.summaryValue, { color: value > 0 ? color : "#9CA3AF" }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SheetItem({ icon, label, description, color }: { icon: string; label: string; description: string; color?: string }) {
  return (
    <View style={[styles.sheetItem, color && { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text style={styles.sheetIcon}>{icon}</Text>
      <View style={styles.sheetInfo}>
        <Text style={styles.sheetLabel}>{label}</Text>
        <Text style={styles.sheetDescription}>{description}</Text>
      </View>
      <Text style={styles.checkMark}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB", backgroundColor: "#FFFFFF",
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#1B4F9B", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  adminBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  content: { flex: 1, padding: 16 },
  adminModeCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  adminModeTitle: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  adminModeBtns: { flexDirection: "row", gap: 8 },
  adminModeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  adminModeBtnActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  adminModeBtnText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  adminModeBtnTextActive: { color: "#FFF" },
  processSelectionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  processSelectionTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E", marginBottom: 10 },
  noProcessesText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", textAlign: "center", paddingVertical: 12 },
  processSelectItem: {
    flexDirection: "row", alignItems: "center", padding: 12,
    borderRadius: 8, marginBottom: 6, backgroundColor: "#F8F9FA",
    borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  processSelectItemActive: { backgroundColor: "#EFF6FF", borderColor: "#1B4F9B" },
  processSelectCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", marginRight: 10, alignItems: "center", justifyContent: "center",
  },
  processSelectCheckActive: { backgroundColor: "#1B4F9B", borderColor: "#1B4F9B" },
  processSelectInfo: { flex: 1 },
  processSelectName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  processSelectArea: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  processStatusDot: { width: 8, height: 8, borderRadius: 4 },
  individualExportBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: "#FEE2E2",
    alignItems: "center", justifyContent: "center", marginLeft: 8,
  },
  consolidatedCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: "#BFDBFE", marginBottom: 14,
  },
  consolidatedText: { flex: 1, fontSize: 13, color: "#1B4F9B", lineHeight: 20 },
  consolidatedCount: { fontWeight: "800" },
  processCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  processLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  processName: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, marginTop: 8 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  summaryCard: {
    width: "30%", backgroundColor: "#FFFFFF", borderRadius: 10, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB",
  },
  summaryIcon: { fontSize: 20, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: "#6B7280", textAlign: "center", fontWeight: "500" },
  sheetsList: { gap: 8, marginBottom: 20 },
  sheetItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E5E7EB",
    borderLeftWidth: 1,
  },
  sheetIcon: { fontSize: 20, marginRight: 12, width: 28, textAlign: "center" },
  sheetInfo: { flex: 1 },
  sheetLabel: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  sheetDescription: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  checkMark: { fontSize: 16, color: "#5CB85C", fontWeight: "700" },
  exportBtn: {
    backgroundColor: "#CC2229", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginBottom: 12,
    shadowColor: "#CC2229", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  exportBtnDisabled: { backgroundColor: "#9CA3AF", shadowOpacity: 0 },
  exportBtnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  exportBtnIcon: { fontSize: 22 },
  exportBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  exportNote: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18, paddingHorizontal: 16 },
});
