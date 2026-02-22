import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { useLisRole } from "./_layout";
import { MaterialIcons } from "@expo/vector-icons";
import { AdminNotificationBanner } from "@/components/admin-notification-banner";

const DOFA_SECTIONS = [
  {
    key: "debilidades" as const,
    label: "Debilidades",
    icon: "⚠️",
    color: "#CC2229",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    description: "Factores internos negativos que limitan el proceso",
    placeholder: "Ej: Falta de automatización en el proceso de facturación",
  },
  {
    key: "oportunidades" as const,
    label: "Oportunidades",
    icon: "💡",
    color: "#F5A623",
    bgColor: "#FFFBEB",
    borderColor: "#FDE68A",
    description: "Factores externos positivos que pueden aprovecharse",
    placeholder: "Ej: Crecimiento del mercado de e-commerce en la región",
  },
  {
    key: "fortalezas" as const,
    label: "Fortalezas",
    icon: "💪",
    color: "#5CB85C",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    description: "Factores internos positivos que generan ventaja",
    placeholder: "Ej: Equipo con alta experiencia en logística internacional",
  },
  {
    key: "amenazas" as const,
    label: "Amenazas",
    icon: "🛡",
    color: "#1B4F9B",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    description: "Factores externos negativos que representan riesgo",
    placeholder: "Ej: Incremento en los costos de transporte internacional",
  },
];

type DofaData = {
  debilidades: string[];
  oportunidades: string[];
  fortalezas: string[];
  amenazas: string[];
};

// ─── Admin View: All DOFA with process filter ─────────────────────────────────

function AdminDofaView() {
  const allDofaQuery = trpc.admin.getAllDofa.useQuery();
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  // Editable local state per process: { [processId]: DofaData }
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [editData, setEditData] = useState<DofaData>({ debilidades: [], oportunidades: [], fortalezas: [], amenazas: [] });
  const [newItems, setNewItems] = useState<Record<string, string>>({ debilidades: "", oportunidades: "", fortalezas: "", amenazas: "" });

  const createNotification = trpc.notification.create.useMutation();

  const saveDofaMut = trpc.admin.saveDofaByProcessId.useMutation({
    onSuccess: (_data, variables) => {
      allDofaQuery.refetch();
      // Notify the process owner about DOFA changes
      const processGroup = allData.find(p => p.processId === variables.processId);
      createNotification.mutate({
        processId: variables.processId,
        module: "dofa",
        message: `Se modificó la matriz DOFA del proceso "${processGroup?.processName ?? ''}"`,
      });
      setEditingProcessId(null);
    },
  });

  const allData = allDofaQuery.data ?? [];

  const filteredData = useMemo(() => {
    if (selectedProcessId === null) return allData;
    return allData.filter(p => p.processId === selectedProcessId);
  }, [allData, selectedProcessId]);

  const startEditing = (processId: number, dofa: DofaData) => {
    setEditingProcessId(processId);
    setEditData({ ...dofa });
    setNewItems({ debilidades: "", oportunidades: "", fortalezas: "", amenazas: "" });
  };

  const handleAddItem = (section: keyof DofaData) => {
    const text = newItems[section]?.trim();
    if (!text) return;
    setEditData(prev => ({ ...prev, [section]: [...prev[section], text] }));
    setNewItems(prev => ({ ...prev, [section]: "" }));
  };

  const handleRemoveItem = (section: keyof DofaData, index: number) => {
    setEditData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  const handleSaveDofa = () => {
    if (!editingProcessId) return;
    saveDofaMut.mutate({ processId: editingProcessId, ...editData });
  };

  if (allDofaQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC2229" />
        <Text style={styles.loadingText}>Cargando DOFA de todos los procesos...</Text>
      </View>
    );
  }

  if (allData.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Sin análisis DOFA registrados</Text>
        <Text style={styles.emptyText}>Ningún líder de área ha completado su análisis DOFA aún.</Text>
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
            Todos ({allData.length})
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
                {p.processName || p.areaName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {filteredData.map(processGroup => {
          const isEditing = editingProcessId === processGroup.processId;
          const currentDofa = isEditing ? editData : processGroup.dofa;
          return (
          <View key={processGroup.processId} style={styles.processBlock}>
            {/* Process Header */}
            <View style={styles.processBlockHeader}>
              <MaterialIcons name="business" size={18} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.processBlockTitle}>{processGroup.processName || processGroup.areaName}</Text>
                {processGroup.leaderName ? (
                  <Text style={styles.processBlockLeader}>Líder: {processGroup.leaderName}</Text>
                ) : null}
              </View>
              {/* Edit / Save button */}
              {isEditing ? (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => setEditingProcessId(null)}
                  >
                    <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: "#5CB85C", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={handleSaveDofa}
                    disabled={saveDofaMut.isPending}
                  >
                    {saveDofaMut.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                  onPress={() => startEditing(processGroup.processId, processGroup.dofa as DofaData)}
                >
                  <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>✏️ Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* DOFA Sections */}
            {DOFA_SECTIONS.map(section => {
              const items = (currentDofa as DofaData)[section.key] ?? [];
              if (items.length === 0 && !isEditing) return null;
              return (
                <View key={section.key} style={[styles.dofaSectionCard, { borderLeftColor: section.color }]}>
                  <View style={[styles.dofaSectionHeader, { backgroundColor: section.bgColor }]}>
                    <Text style={styles.dofaSectionIcon}>{section.icon}</Text>
                    <Text style={[styles.dofaSectionTitle, { color: section.color }]}>{section.label}</Text>
                    <View style={[styles.countBadge, { backgroundColor: section.color }]}>
                      <Text style={styles.countBadgeText}>{items.length}</Text>
                    </View>
                  </View>
                  <View style={styles.dofaItemsList}>
                    {items.length === 0 ? (
                      <Text style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", paddingVertical: 4 }}>Sin elementos</Text>
                    ) : items.map((item, idx) => (
                      <View key={idx} style={styles.dofaItemRow}>
                        <View style={[styles.itemBullet, { backgroundColor: section.color }]} />
                        <Text style={styles.itemText}>{item}</Text>
                        {isEditing && (
                          <TouchableOpacity onPress={() => handleRemoveItem(section.key, idx)} style={styles.removeBtn}>
                            <Text style={styles.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                  {isEditing && (
                    <View style={styles.addItemContainer}>
                      <TextInput
                        style={[styles.addItemInput, { borderColor: section.borderColor }]}
                        value={newItems[section.key]}
                        onChangeText={v => setNewItems(prev => ({ ...prev, [section.key]: v }))}
                        placeholder={section.placeholder}
                        placeholderTextColor="#9CA3AF"
                        multiline
                        returnKeyType="done"
                        onSubmitEditing={() => handleAddItem(section.key)}
                      />
                      <TouchableOpacity
                        style={[styles.addItemBtn, { backgroundColor: section.color }]}
                        onPress={() => handleAddItem(section.key)}
                      >
                        <Text style={styles.addItemBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── User View: Own DOFA ──────────────────────────────────────────────────────

function UserDofaView() {
  const [data, setData] = useState<DofaData>({
    debilidades: [],
    oportunidades: [],
    fortalezas: [],
    amenazas: [],
  });
  const [newItems, setNewItems] = useState<Record<string, string>>({
    debilidades: "",
    oportunidades: "",
    fortalezas: "",
    amenazas: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [observations, setObservations] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const observationQuery = trpc.observation.get.useQuery({ module: "dofa" });
  const saveObservation = trpc.observation.save.useMutation();

  useEffect(() => {
    if (observationQuery.data?.observations) {
      setObservations(observationQuery.data.observations);
    }
  }, [observationQuery.data]);

  const dofaQuery = trpc.dofa.get.useQuery();
  const saveDofa = trpc.dofa.save.useMutation({
    onSuccess: () => {
      dofaQuery.refetch();
      setHasChanges(false);
      setIsSaving(false);
    },
    onError: () => setIsSaving(false),
  });

  useEffect(() => {
    if (dofaQuery.data) {
      setData({
        debilidades: dofaQuery.data.debilidades ?? [],
        oportunidades: dofaQuery.data.oportunidades ?? [],
        fortalezas: dofaQuery.data.fortalezas ?? [],
        amenazas: dofaQuery.data.amenazas ?? [],
      });
    }
  }, [dofaQuery.data]);

  const handleAddItem = (section: keyof DofaData) => {
    const text = newItems[section]?.trim();
    if (!text) return;
    const updated = { ...data, [section]: [...data[section], text] };
    setData(updated);
    setNewItems(prev => ({ ...prev, [section]: "" }));
    setHasChanges(true);
  };

  const handleRemoveItem = (section: keyof DofaData, index: number) => {
    const updated = { ...data, [section]: data[section].filter((_, i) => i !== index) };
    setData(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    const totalItems = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
    if (totalItems === 0) {
      setSaveError("⚠️ Debes agregar al menos un elemento en cualquier cuadrante del DOFA antes de guardar.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    saveDofa.mutate(data);
    if (observations.trim()) {
      saveObservation.mutate({ module: "dofa", observations });
    }
  };

  const totalItems = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <>
      {/* Admin Notification Banner */}
      <AdminNotificationBanner module="dofa" />

      {/* Summary Banner */}
      {totalItems > 0 && (
        <View style={styles.summaryBanner}>
          {DOFA_SECTIONS.map(section => (
            <View key={section.key} style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: section.color }]}>
                {data[section.key].length}
              </Text>
              <Text style={styles.summaryLabel}>{section.label}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {dofaQuery.isLoading ? (
          <ActivityIndicator color="#CC2229" style={{ marginTop: 40 }} />
        ) : (
          DOFA_SECTIONS.map(section => (
            <View key={section.key} style={[styles.sectionCard, { borderColor: section.borderColor, borderTopColor: section.color, borderTopWidth: 3 }]}>
              {/* Section Header */}
              <View style={[styles.sectionHeader, { backgroundColor: section.bgColor }]}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: section.color }]}>{section.label}</Text>
                  <Text style={styles.sectionDescription}>{section.description}</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: section.color }]}>
                  <Text style={styles.countBadgeText}>{data[section.key].length}</Text>
                </View>
              </View>

              {/* Items List */}
              <View style={styles.itemsList}>
                {data[section.key].length === 0 ? (
                  <Text style={styles.emptyItemsText}>Sin elementos registrados</Text>
                ) : (
                  data[section.key].map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={[styles.itemBullet, { backgroundColor: section.color }]} />
                      <Text style={styles.itemText}>{item}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(section.key, index)}
                        style={styles.removeBtn}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Add Item Input */}
              <View style={styles.addItemContainer}>
                <TextInput
                  style={[styles.addItemInput, { borderColor: section.borderColor }]}
                  value={newItems[section.key]}
                  onChangeText={v => setNewItems(prev => ({ ...prev, [section.key]: v }))}
                  placeholder={section.placeholder}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  returnKeyType="done"
                  onSubmitEditing={() => handleAddItem(section.key)}
                />
                <TouchableOpacity
                  style={[styles.addItemBtn, { backgroundColor: section.color }]}
                  onPress={() => handleAddItem(section.key)}
                >
                  <Text style={styles.addItemBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Observations */}
        <View style={styles.observationsCard}>
          <Text style={styles.observationsLabel}>Observaciones Generales</Text>
          <TextInput
            style={styles.observationsInput}
            value={observations}
            onChangeText={v => { setObservations(v); setHasChanges(true); }}
            placeholder="Observaciones adicionales sobre el análisis DOFA del proceso..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Save error */}
        {saveError && (
          <View style={styles.saveErrorBox}>
            <Text style={styles.saveErrorText}>{saveError}</Text>
          </View>
        )}

        {/* Save Button at bottom */}
        {hasChanges && (
          <TouchableOpacity style={styles.bottomSaveBtn} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.bottomSaveBtnText}>Guardar Análisis DOFA</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DofaScreen() {
  const lisRole = useLisRole();
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Análisis DOFA</Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin ? "Vista administrador — todos los procesos" : "Diagnóstico estratégico del proceso"}
          </Text>
        </View>
        {isAdmin ? (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : null}
      </View>

      {isAdmin ? <AdminDofaView /> : <UserDofaView />}
    </ScreenContainer>
    </KeyboardAvoidingView>
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
    flexDirection: "row", alignItems: "center", backgroundColor: "#1B4F9B",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4,
  },
  adminBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },
  saveBtn: { backgroundColor: "#5CB85C", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
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
    marginBottom: 20, borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  processBlockHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1B4F9B", paddingHorizontal: 14, paddingVertical: 10,
  },
  processBlockTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  processBlockLeader: { fontSize: 11, color: "#BFD4F7", marginTop: 2 },
  dofaSummaryRow: { flexDirection: "row", gap: 4 },
  dofaSummaryBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dofaSummaryBadgeText: { fontSize: 10, color: "#FFFFFF", fontWeight: "700" },
  // Admin DOFA section card
  dofaSectionCard: {
    borderLeftWidth: 3, marginHorizontal: 12, marginBottom: 8, borderRadius: 8,
    overflow: "hidden", backgroundColor: "#FAFAFA",
  },
  dofaSectionHeader: { flexDirection: "row", alignItems: "center", padding: 10, gap: 8 },
  dofaSectionIcon: { fontSize: 18 },
  dofaSectionTitle: { flex: 1, fontSize: 13, fontWeight: "700" },
  dofaItemsList: { paddingHorizontal: 12, paddingBottom: 10 },
  dofaItemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  // Summary banner (user view)
  summaryBanner: {
    flexDirection: "row", backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 10,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryCount: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 10, color: "#6B7280", fontWeight: "600", textTransform: "uppercase" },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  sectionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 16,
    borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  sectionIcon: { fontSize: 24, marginRight: 12 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionDescription: { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 17 },
  countBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  countBadgeText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  itemsList: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  emptyItemsText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", paddingVertical: 8 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  itemBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 10, flexShrink: 0 },
  itemText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 21 },
  removeBtn: { padding: 4, marginLeft: 8 },
  removeBtnText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  addItemContainer: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  addItemInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, padding: 10, fontSize: 13, color: "#1A1A2E", minHeight: 40 },
  addItemBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addItemBtnText: { color: "#FFF", fontSize: 22, fontWeight: "300", lineHeight: 28 },
  bottomSaveBtn: {
    backgroundColor: "#5CB85C", paddingVertical: 15, borderRadius: 12,
    alignItems: "center", marginBottom: 16,
    shadowColor: "#5CB85C", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  bottomSaveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  observationsCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1,
    borderColor: "#E5E7EB", padding: 14, marginBottom: 12,
  },
  observationsLabel: {
    fontSize: 12, fontWeight: "700", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  observationsInput: {
    borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 8,
    padding: 10, fontSize: 14, color: "#1A1A2E", minHeight: 80,
  },
  saveErrorBox: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 8, padding: 12, marginBottom: 12,
  },
  saveErrorText: { fontSize: 13, color: "#CC2229", fontWeight: "600" },
});
