import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, FlatList
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { KeyboardModal } from "@/components/keyboard-modal";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";
import { AdminNotificationBanner } from "@/components/admin-notification-banner";

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
  observations: string;
};

const EMPTY_FORM: KPIForm = {
  name: "",
  objective: "",
  frequency: "mes",
  formula: "",
  responsible: "",
  observations: "",
};

// ─── Admin View: All KPIs with process filter ─────────────────────────────────

function AdminKPIsView() {
  const allKPIsQuery = trpc.admin.getAllKPIs.useQuery();
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KPIForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const allData = allKPIsQuery.data ?? [];

  const filteredData = useMemo(() => {
    if (selectedProcessId === null) return allData;
    return allData.filter(p => p.processId === selectedProcessId);
  }, [allData, selectedProcessId]);

  const createNotification = trpc.notification.create.useMutation();

  const updateKPI = trpc.kpi.update.useMutation({
    onSuccess: (_data, variables) => {
      allKPIsQuery.refetch();
      // Find which process this KPI belongs to and notify
      const processGroup = allData.find(p => p.kpis.some(k => k.id === variables.id));
      if (processGroup) {
        createNotification.mutate({
          processId: processGroup.processId,
          module: "kpis",
          message: `Se modificó el KPI "${variables.name ?? ''}"`,
        });
      }
      setShowEditModal(false); setEditingId(null); setForm(EMPTY_FORM);
    },
  });

  const deleteKPI = trpc.kpi.delete.useMutation({
    onSuccess: () => allKPIsQuery.refetch(),
  });

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("• Nombre del KPI es obligatorio");
    if (!form.objective.trim()) errors.push("• Objetivo es obligatorio");
    if (!form.formula.trim()) errors.push("• Fórmula de cálculo es obligatoria");
    if (!form.responsible.trim()) errors.push("• Responsable es obligatorio");
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm() || !editingId) return;
    updateKPI.mutate({ id: editingId, ...form });
  };

  const handleEdit = (kpi: any) => {
    setForm({
      name: kpi.name,
      objective: kpi.objective,
      frequency: kpi.frequency,
      formula: kpi.formula,
      responsible: kpi.responsible,
      observations: kpi.observations ?? "",
    });
    setEditingId(kpi.id);
    setFormErrors([]);
    setShowEditModal(true);
  };

  const handleDelete = (id: number, name: string) => {
    const processGroup = allData.find(p => p.kpis.some(k => k.id === id));
    Alert.alert("Eliminar KPI", `¿Eliminar el KPI "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => {
        deleteKPI.mutate({ id });
        if (processGroup) {
          createNotification.mutate({
            processId: processGroup.processId,
            module: "kpis",
            message: `Se eliminó el KPI "${name}"`,
          });
        }
      }},
    ]);
  };

  if (allKPIsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.loadingText}>Cargando KPIs de todos los procesos...</Text>
      </View>
    );
  }

  if (allData.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Sin KPIs registrados</Text>
        <Text style={styles.emptyText}>Ningún líder de área ha registrado KPIs aún.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, selectedProcessId === null && styles.filterBtnActive]}
          onPress={() => setSelectedProcessId(null)}
        >
          <Text style={[styles.filterBtnText, selectedProcessId === null && styles.filterBtnTextActive]}>
            Todos ({allData.reduce((s, p) => s + p.kpis.length, 0)})
          </Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {allData.map(p => (
            <TouchableOpacity
              key={p.processId}
              style={[styles.filterBtn, selectedProcessId === p.processId && styles.filterBtnActive]}
              onPress={() => setSelectedProcessId(p.processId)}
            >
              <Text
                style={[styles.filterBtnText, selectedProcessId === p.processId && styles.filterBtnTextActive]}
                numberOfLines={1}
              >
                {p.processName || p.areaName} ({p.kpis.length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {filteredData.map(processGroup => (
          <View key={processGroup.processId} style={styles.processBlock}>
            <View style={styles.processBlockHeader}>
              <MaterialIcons name="business" size={18} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.processBlockTitle}>{processGroup.processName || processGroup.areaName}</Text>
                {processGroup.leaderName ? (
                  <Text style={styles.processBlockLeader}>Líder: {processGroup.leaderName}</Text>
                ) : null}
              </View>
              <View style={styles.kpiCountBadge}>
                <Text style={styles.kpiCountBadgeText}>{processGroup.kpis.length} KPI{processGroup.kpis.length !== 1 ? "s" : ""}</Text>
              </View>
            </View>
            {processGroup.kpis.map((kpi, index) => (
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
                  <KPIField label="Responsable" value={kpi.responsible} />
                </View>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit KPI Modal */}
      <KeyboardModal
        visible={showEditModal}
        onClose={() => { setShowEditModal(false); setForm(EMPTY_FORM); setEditingId(null); }}
        title="Editar KPI"
      >
        <View style={styles.modalPadding}>
          {formErrors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>⚠️ Campos obligatorios incompletos:</Text>
              {formErrors.map((e, i) => <Text key={i} style={styles.errorItem}>{e}</Text>)}
            </View>
          )}
          <FormField label="Nombre del KPI *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Ej: Nivel de Servicio al Cliente" hasError={formErrors.some(e => e.includes("Nombre"))} />
          <FormField label="Objetivo *" value={form.objective} onChangeText={v => setForm(f => ({ ...f, objective: v }))} placeholder="Ej: Medir el porcentaje de pedidos entregados a tiempo" multiline hasError={formErrors.some(e => e.includes("Objetivo"))} />
          <FormField label="Fórmula de Cálculo *" value={form.formula} onChangeText={v => setForm(f => ({ ...f, formula: v }))} placeholder="Ej: (Pedidos entregados a tiempo / Total pedidos) × 100" multiline isFormula hasError={formErrors.some(e => e.includes("Fórmula"))} />
          <FormField label="Responsable *" value={form.responsible} onChangeText={v => setForm(f => ({ ...f, responsible: v }))} placeholder="Ej: Gerente de Operaciones" hasError={formErrors.some(e => e.includes("Responsable"))} />
          <FormField label="Observaciones" value={form.observations} onChangeText={v => setForm(f => ({ ...f, observations: v }))} placeholder="Observaciones adicionales sobre este KPI..." multiline />
          <Text style={styles.inputLabel}>Frecuencia de Medición *</Text>
          <View style={styles.frequencySelector}>
            {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.freqOption, form.frequency === opt.value && styles.freqOptionActive]} onPress={() => setForm(f => ({ ...f, frequency: opt.value }))}>
                <Text style={styles.freqOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.freqOptionText, form.frequency === opt.value && styles.freqOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowEditModal(false); setForm(EMPTY_FORM); setEditingId(null); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={updateKPI.isPending}>
              {updateKPI.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Actualizar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>
    </View>
  );
}

// ─── User View: Own KPIs ──────────────────────────────────────────────────────

function UserKPIsView() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KPIForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);

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

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("• Nombre del KPI es obligatorio");
    if (!form.objective.trim()) errors.push("• Objetivo es obligatorio");
    if (!form.formula.trim()) errors.push("• Fórmula de cálculo es obligatoria");
    if (!form.responsible.trim()) errors.push("• Responsable es obligatorio");
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
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
      observations: kpi.observations ?? "",
    });
    setEditingId(kpi.id);
    setFormErrors([]);
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
    <>
      {/* Admin Notification Banner */}
      <AdminNotificationBanner module="kpis" />

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
      <KeyboardModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setForm(EMPTY_FORM); setEditingId(null); }}
        title={editingId ? "Editar KPI" : "Nuevo KPI"}
      >
        <View style={styles.modalPadding}>
          {formErrors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>⚠️ Campos obligatorios incompletos:</Text>
              {formErrors.map((e, i) => <Text key={i} style={styles.errorItem}>{e}</Text>)}
            </View>
          )}
          <FormField label="Nombre del KPI *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Ej: Nivel de Servicio al Cliente" hasError={formErrors.some(e => e.includes("Nombre"))} />
          <FormField label="Objetivo *" value={form.objective} onChangeText={v => setForm(f => ({ ...f, objective: v }))} placeholder="Ej: Medir el porcentaje de pedidos entregados a tiempo" multiline hasError={formErrors.some(e => e.includes("Objetivo"))} />
          <FormField label="Fórmula de Cálculo *" value={form.formula} onChangeText={v => setForm(f => ({ ...f, formula: v }))} placeholder="Ej: (Pedidos entregados a tiempo / Total pedidos) × 100" multiline isFormula hasError={formErrors.some(e => e.includes("Fórmula"))} />
          <FormField label="Responsable *" value={form.responsible} onChangeText={v => setForm(f => ({ ...f, responsible: v }))} placeholder="Ej: Gerente de Operaciones" hasError={formErrors.some(e => e.includes("Responsable"))} />
          <FormField label="Observaciones" value={form.observations} onChangeText={v => setForm(f => ({ ...f, observations: v }))} placeholder="Observaciones adicionales sobre este KPI..." multiline />
          <Text style={styles.inputLabel}>Frecuencia de Medición *</Text>
          <View style={styles.frequencySelector}>
            {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.freqOption, form.frequency === opt.value && styles.freqOptionActive]} onPress={() => setForm(f => ({ ...f, frequency: opt.value }))}>
                <Text style={styles.freqOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.freqOptionText, form.frequency === opt.value && styles.freqOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowAddModal(false); setForm(EMPTY_FORM); setEditingId(null); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={createKPI.isPending || updateKPI.isPending}>
              {(createKPI.isPending || updateKPI.isPending) ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>{editingId ? "Actualizar" : "Guardar"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KPIsScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>KPIs del Proceso</Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin ? "Vista administrador — todos los procesos" : "Indicadores clave de desempeño"}
          </Text>
        </View>
        {isAdmin ? (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              // Trigger add modal via ref — handled inside UserKPIsView
              // We pass a key to force re-mount with showAddModal=true
            }}
          >
          </TouchableOpacity>
        )}
      </View>

      {isAdmin ? <AdminKPIsView /> : <UserKPIsViewWrapper />}
    </ScreenContainer>
  );
}

// Wrapper to allow the header add button to work
function UserKPIsViewWrapper() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KPIForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);

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

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("• Nombre del KPI es obligatorio");
    if (!form.objective.trim()) errors.push("• Objetivo es obligatorio");
    if (!form.formula.trim()) errors.push("• Fórmula de cálculo es obligatoria");
    if (!form.responsible.trim()) errors.push("• Responsable es obligatorio");
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
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
      observations: kpi.observations ?? "",
    });
    setEditingId(kpi.id);
    setFormErrors([]);
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
    <>
      {/* Add Button */}
      <View style={styles.userAddRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setForm(EMPTY_FORM); setEditingId(null); setShowAddModal(true); }}
        >
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
      <KeyboardModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setForm(EMPTY_FORM); setEditingId(null); }}
        title={editingId ? "Editar KPI" : "Nuevo KPI"}
      >
        <View style={styles.modalPadding}>
          {formErrors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>⚠️ Campos obligatorios incompletos:</Text>
              {formErrors.map((e, i) => <Text key={i} style={styles.errorItem}>{e}</Text>)}
            </View>
          )}
          <FormField label="Nombre del KPI *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Ej: Nivel de Servicio al Cliente" hasError={formErrors.some(e => e.includes("Nombre"))} />
          <FormField label="Objetivo *" value={form.objective} onChangeText={v => setForm(f => ({ ...f, objective: v }))} placeholder="Ej: Medir el porcentaje de pedidos entregados a tiempo" multiline hasError={formErrors.some(e => e.includes("Objetivo"))} />
          <FormField label="Fórmula de Cálculo *" value={form.formula} onChangeText={v => setForm(f => ({ ...f, formula: v }))} placeholder="Ej: (Pedidos entregados a tiempo / Total pedidos) × 100" multiline isFormula hasError={formErrors.some(e => e.includes("Fórmula"))} />
          <FormField label="Responsable *" value={form.responsible} onChangeText={v => setForm(f => ({ ...f, responsible: v }))} placeholder="Ej: Gerente de Operaciones" hasError={formErrors.some(e => e.includes("Responsable"))} />
          <FormField label="Observaciones" value={form.observations} onChangeText={v => setForm(f => ({ ...f, observations: v }))} placeholder="Observaciones adicionales sobre este KPI..." multiline />
          <Text style={styles.inputLabel}>Frecuencia de Medición *</Text>
          <View style={styles.frequencySelector}>
            {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.freqOption, form.frequency === opt.value && styles.freqOptionActive]} onPress={() => setForm(f => ({ ...f, frequency: opt.value }))}>
                <Text style={styles.freqOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.freqOptionText, form.frequency === opt.value && styles.freqOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowAddModal(false); setForm(EMPTY_FORM); setEditingId(null); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={createKPI.isPending || updateKPI.isPending}>
              {(createKPI.isPending || updateKPI.isPending) ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>{editingId ? "Actualizar" : "Guardar"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>
    </>
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

function FormField({ label, value, onChangeText, placeholder, multiline, isFormula, hasError }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; isFormula?: boolean; hasError?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 72 }, isFormula && styles.formulaInput, hasError && styles.inputError]}
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
  adminBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1B4F9B",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4,
  },
  adminBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },
  userAddRow: {
    flexDirection: "row", justifyContent: "flex-end",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  countBanner: { backgroundColor: "#FEF2F2", paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#FECACA" },
  countText: { fontSize: 13, color: "#CC2229", fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  // Filter bar
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
  filterBtnActive: { backgroundColor: "#CC2229", borderColor: "#CC2229" },
  filterBtnText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  filterBtnTextActive: { color: "#FFFFFF" },
  // Process block
  processBlock: {
    marginBottom: 16, borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  processBlockHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1B4F9B", paddingHorizontal: 14, paddingVertical: 10,
  },
  processBlockTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  processBlockLeader: { fontSize: 11, color: "#BFD4F7", marginTop: 2 },
  kpiCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  kpiCountBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  // KPI Card
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
  modalPadding: { paddingHorizontal: 20, paddingTop: 8 },
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
  errorBox: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 8, padding: 12, marginBottom: 14,
  },
  errorTitle: { fontSize: 13, fontWeight: "700", color: "#CC2229", marginBottom: 4 },
  errorItem: { fontSize: 12, color: "#CC2229", lineHeight: 20 },
  inputError: { borderColor: "#CC2229", backgroundColor: "#FEF2F2" },
});
