import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { buildExcelWorkbook, downloadExcel } from "@/lib/excel-export";
import { useAuth } from "@/hooks/use-auth";
import { MaterialIcons } from "@expo/vector-icons";

const EXPORT_SECTIONS = [
  { key: "organigrama", label: "Organigrama del Área", icon: "👥", color: "#1B4F9B" },
  { key: "kpis", label: "KPIs del Proceso", icon: "📊", color: "#CC2229" },
  { key: "dofa", label: "Análisis DOFA", icon: "🔍", color: "#5CB85C" },
  { key: "proveedores", label: "Proveedores del Proceso", icon: "📦", color: "#F5A623" },
  { key: "clientes", label: "Clientes del Proceso", icon: "🤝", color: "#6366F1" },
];

export default function ExportarScreen() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"individual" | "consolidated" | "selected">("individual");
  const [selectedProcessIds, setSelectedProcessIds] = useState<number[]>([]);

  // User queries
  const processQuery = trpc.process.getOrCreate.useQuery();
  const orgChartQuery = trpc.export.orgChart.useQuery();
  const kpisExportQuery = trpc.export.kpis.useQuery();
  const dofaExportQuery = trpc.export.dofa.useQuery();
  const interactionsExportQuery = trpc.export.interactions.useQuery();

  // Admin queries
  const allProcessesQuery = trpc.admin.getAllProcesses.useQuery(undefined, { enabled: isAdmin });

  const isLoading =
    processQuery.isLoading ||
    orgChartQuery.isLoading ||
    kpisExportQuery.isLoading ||
    dofaExportQuery.isLoading ||
    interactionsExportQuery.isLoading;

  const process = processQuery.data;
  const orgData = orgChartQuery.data;
  const kpisData = kpisExportQuery.data;
  const dofaData = dofaExportQuery.data;
  const interactionsData = interactionsExportQuery.data;

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
  };

  const totalItems = Object.values(stats).reduce((a, b) => a + b, 0);

  const allProcesses = allProcessesQuery.data ?? [];

  const toggleProcessSelection = (id: number) => {
    setSelectedProcessIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
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
        { process, interactions: interactionsData?.interactions ?? [] }
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
      // Build a combined workbook with all selected processes
      const XLSX = require("xlsx");
      const wb = XLSX.utils.book_new();

      // Cover sheet
      const coverData = [
        ["LOGÍSTICA INTELIGENTE SOLUTION"],
        ["Levantamiento Consolidado de Procesos"],
        [`Fecha de Exportación: ${new Date().toLocaleDateString("es-CO")}`],
        [`Procesos incluidos: ${targetIds.length}`],
        [],
        ["Proceso", "Área", "Responsable", "Fecha Actualización"],
        ...allProcesses
          .filter((p: any) => targetIds.includes(p.id))
          .map((p: any) => [p.processName, p.areaName ?? "", p.responsibleName ?? "", p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("es-CO") : ""])
      ];
      const coverWS = XLSX.utils.aoa_to_sheet(coverData);
      XLSX.utils.book_append_sheet(wb, coverWS, "Portada");

      const filename = `LIS_Consolidado_${exportMode === "consolidated" ? "Todos" : "Seleccion"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      await downloadExcel(wb, filename);
      Alert.alert("Éxito", `Archivo consolidado generado con ${targetIds.length} proceso(s).`);
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
            : "El archivo consolidado incluye todos los procesos seleccionados en hojas separadas."}
        </Text>

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
