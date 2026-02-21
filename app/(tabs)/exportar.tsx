import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { buildExcelWorkbook, downloadExcel } from "@/lib/excel-export";

const EXPORT_SECTIONS = [
  { key: "organigrama", label: "Organigrama del Área", icon: "👥", color: "#1B4F9B" },
  { key: "kpis", label: "KPIs del Proceso", icon: "📊", color: "#CC2229" },
  { key: "dofa", label: "Análisis DOFA", icon: "🔍", color: "#5CB85C" },
  { key: "proveedores", label: "Proveedores del Proceso", icon: "📦", color: "#F5A623" },
  { key: "clientes", label: "Clientes del Proceso", icon: "🤝", color: "#6366F1" },
];

export default function ExportarScreen() {
  const [isExporting, setIsExporting] = useState(false);

  const processQuery = trpc.process.getOrCreate.useQuery();
  const orgChartQuery = trpc.export.orgChart.useQuery();
  const kpisExportQuery = trpc.export.kpis.useQuery();
  const dofaExportQuery = trpc.export.dofa.useQuery();
  const interactionsExportQuery = trpc.export.interactions.useQuery();

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

  const handleExport = async () => {
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
        {
          process,
          hierarchies: orgData?.hierarchies ?? [],
          collaborators: orgData?.collaborators ?? [],
          functions: orgData?.functions ?? [],
        },
        { process, kpis: kpisData?.kpis ?? [] },
        { process, dofa: dofaData?.dofa },
        { process, interactions: interactionsData?.interactions ?? [] }
      );
      const filename = `LIS_Levantamiento_${process.processName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      await downloadExcel(wb, filename);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el archivo Excel. Intenta nuevamente.");
      console.error("Export error:", error);
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
          <Text style={styles.headerSubtitle}>Descarga el levantamiento completo en Excel</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, (isExporting || isLoading) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <View style={styles.exportBtnContent}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.exportBtnText}>Generando Excel...</Text>
            </View>
          ) : (
            <View style={styles.exportBtnContent}>
              <Text style={styles.exportBtnIcon}>📥</Text>
              <Text style={styles.exportBtnText}>Descargar Excel Completo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.exportNote}>
          El archivo incluye todas las hojas con el levantamiento completo del proceso, listo para compartir o archivar.
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
  content: { flex: 1, padding: 16 },
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
