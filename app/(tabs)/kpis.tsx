import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Modal, FlatList
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const FREQUENCY_OPTIONS = [
  { value: "dia", label: "Diario", icon: "📅" },
  { value: "semana", label: "Semanal", icon: "📆" },
  { value: "mes", label: "Mensual", icon: "🗓" },
] as const;

type Frequency = "dia" | "semana" | "mes";

type KPIForm = {
  name: string;
  objective: string;
  frequency: Frequency;
  formula: string;
  responsible: string;
};

const EMPTY_FORM: KPIForm = {
  name: "",
  objective: "",
  frequency: "mes",
  formula: "",
  responsible: "",
};

export default function KPIsScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KPIForm>(EMPTY_FORM);

  const kpisQuery = trpc.kpi.list.useQuery();

  const createKPI = trpc.kpi.create.useMutation({
    onSuccess: () => { kpisQuery.refetch(); setShowAddModal(false); setForm(EMPTY_FORM); },
  });

  const updateKPI = trpc.kpi.update.useMutation({
    onSuccess: () => { kpisQuery.refetch(); setShowAddModal(false); setEditingId(null); setForm(EMPTY_FORM); },
  });

  const deleteKPI = trpc.kpi.delete.useMutation({
    onSuccess: () => kpisQuery.refetch(),
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.objective.trim() || !form.formula.trim() || !form.responsible.trim()) {
      Alert.alert("Campos requeridos", "Por favor completa todos los campos del KPI");
      return;
    }
    if (editingId) {
      updateKPI.mutate({ id: editingId, ...form });
    } else {
      createKPI.mutate(form);
    }
  };

  const handleEdit = (kpi: any) => {
    setForm({
      name: kpi.name,
      objective: kpi.objective,
      frequency: kpi.frequency,
      formula: kpi.formula,
      responsible: kpi.responsible,
    });
    setEditingId(kpi.id);
    setShowAddModal(true);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Eliminar KPI", `¿Eliminar el KPI "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteKPI.mutate({ id }) },
    ]);
  };

  const kpis = kpisQuery.data ?? [];

  const getFrequencyLabel = (freq: Frequency) => FREQUENCY_OPTIONS.find(f => f.value === freq)?.label ?? freq;
  const getFrequencyIcon = (freq: Frequency) => FREQUENCY_OPTIONS.find(f => f.value === freq)?.icon ?? "📅";

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>KPIs del Proceso</Text>
          <Text style={styles.headerSubtitle}>Indicadores clave de desempeño</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_FORM); setEditingId(null); setShowAddModal(true); }}>
          <Text style={styles.addBtnText}>+ KPI</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Count Banner */}
      {kpis.length > 0 && (
        <View style={styles.countBanner}>
          <Text style={styles.countText}>{kpis.length} indicador{kpis.length !== 1 ? "es" : ""} registrado{kpis.length !== 1 ? "s" : ""}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {kpisQuery.isLoading ? (
          <ActivityIndicator color="#CC2229" style={{ marginTop: 40 }} />
        ) : kpis.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Sin KPIs registrados</Text>
            <Text style={styles.emptyText}>Agrega los indicadores clave de desempeño de tu proceso tocando "+ KPI"</Text>
          </View>
        ) : (
          kpis.map((kpi, index) => (
            <View key={kpi.id} style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <View style={styles.kpiNumber}>
                  <Text style={styles.kpiNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.kpiName} numberOfLines={2}>{kpi.name}</Text>
                <View style={styles.kpiActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(kpi)}>
                    <Text style={styles.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(kpi.id, kpi.name)}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.kpiBody}>
                <KPIField label="Objetivo" value={kpi.objective} />
                <KPIField label="Fórmula de Cálculo" value={kpi.formula} isFormula />
                <View style={styles.kpiRow}>
                  <View style={styles.kpiFieldHalf}>
                    <Text style={styles.fieldLabel}>Frecuencia</Text>
                    <View style={styles.frequencyBadge}>
                      <Text style={styles.frequencyIcon}>{getFrequencyIcon(kpi.frequency as Frequency)}</Text>
                      <Text style={styles.frequencyText}>{getFrequencyLabel(kpi.frequency as Frequency)}</Text>
                    </View>
                  </View>
                  <View style={styles.kpiFieldHalf}>
                    <Text style={styles.fieldLabel}>Responsable</Text>
                    <Text style={styles.fieldValue}>{kpi.responsible}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit KPI Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingId ? "Editar KPI" : "Nuevo KPI"}</Text>

              <FormField
                label="Nombre del KPI *"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Ej: Nivel de Servicio al Cliente"
              />
              <FormField
                label="Objetivo *"
                value={form.objective}
                onChangeText={v => setForm(f => ({ ...f, objective: v }))}
                placeholder="Ej: Medir el porcentaje de pedidos entregados a tiempo"
                multiline
              />
              <FormField
                label="Fórmula de Cálculo *"
                value={form.formula}
                onChangeText={v => setForm(f => ({ ...f, formula: v }))}
                placeholder="Ej: (Pedidos entregados a tiempo / Total pedidos) × 100"
                multiline
                isFormula
              />
              <FormField
                label="Responsable *"
                value={form.responsible}
                onChangeText={v => setForm(f => ({ ...f, responsible: v }))}
                placeholder="Ej: Gerente de Operaciones"
              />

              <Text style={styles.inputLabel}>Frecuencia de Medición *</Text>
              <View style={styles.frequencySelector}>
                {FREQUENCY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.freqOption, form.frequency === opt.value && styles.freqOptionActive]}
                    onPress={() => setForm(f => ({ ...f, frequency: opt.value }))}
                  >
                    <Text style={styles.freqOptionIcon}>{opt.icon}</Text>
                    <Text style={[styles.freqOptionText, form.frequency === opt.value && styles.freqOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => { setShowAddModal(false); setForm(EMPTY_FORM); setEditingId(null); }}
                >
                  <Text style={styles.cancelModalText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveModalBtn}
                  onPress={handleSave}
                  disabled={createKPI.isPending || updateKPI.isPending}
                >
                  {(createKPI.isPending || updateKPI.isPending) ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveModalText}>{editingId ? "Actualizar" : "Guardar"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function KPIField({ label, value, isFormula }: { label: string; value: string; isFormula?: boolean }) {
  return (
    <View style={styles.kpiField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, isFormula && styles.formulaValue]}>{value}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, multiline, isFormula }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; isFormula?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 72 }, isFormula && styles.formulaInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
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
  addBtn: { backgroundColor: "#CC2229", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  countBanner: { backgroundColor: "#FEF2F2", paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#FECACA" },
  countText: { fontSize: 13, color: "#CC2229", fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  kpiCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  kpiHeader: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  kpiNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#CC2229", alignItems: "center", justifyContent: "center", marginRight: 10 },
  kpiNumberText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  kpiName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  kpiActions: { flexDirection: "row", gap: 8 },
  editBtn: { padding: 4 },
  editBtnText: { fontSize: 16 },
  deleteIcon: { fontSize: 16, padding: 4 },
  kpiBody: { padding: 14 },
  kpiField: { marginBottom: 10 },
  kpiRow: { flexDirection: "row", gap: 12 },
  kpiFieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  fieldValue: { fontSize: 14, color: "#374151", lineHeight: 20 },
  formulaValue: { fontFamily: "monospace", backgroundColor: "#F8F9FA", padding: 8, borderRadius: 6, fontSize: 13, color: "#1B4F9B" },
  frequencyBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: "flex-start" },
  frequencyIcon: { fontSize: 14, marginRight: 5 },
  frequencyText: { fontSize: 13, fontWeight: "600", color: "#5CB85C" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "90%" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A2E" },
  formulaInput: { fontFamily: "monospace", backgroundColor: "#F8F9FA", color: "#1B4F9B" },
  frequencySelector: { flexDirection: "row", gap: 8, marginBottom: 16 },
  freqOption: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB" },
  freqOptionActive: { backgroundColor: "#CC2229", borderColor: "#CC2229" },
  freqOptionIcon: { fontSize: 20, marginBottom: 4 },
  freqOptionText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  freqOptionTextActive: { color: "#FFFFFF" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelModalBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  cancelModalText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
  saveModalBtn: { flex: 1, backgroundColor: "#CC2229", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  saveModalText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
