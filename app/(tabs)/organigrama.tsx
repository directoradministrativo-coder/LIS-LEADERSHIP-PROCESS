import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, FlatList
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { KeyboardModal } from "@/components/keyboard-modal";
import { useAppAlert } from "@/components/app-alert";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const HIERARCHY_LEVELS = [
  { level: 1, label: "Director", color: "#CC2229", bgColor: "#FEF2F2" },
  { level: 2, label: "Gerente", color: "#1B4F9B", bgColor: "#EFF6FF" },
  { level: 3, label: "Coordinador", color: "#5CB85C", bgColor: "#F0FDF4" },
  { level: 4, label: "Analista", color: "#F5A623", bgColor: "#FFFBEB" },
  { level: 5, label: "Auxiliar", color: "#6366F1", bgColor: "#EEF2FF" },
];

type Hierarchy = {
  id: number;
  name: string;
  level: number;
  parentId?: number | null;
  isCustom?: boolean;
  processId: number;
};

type Collaborator = {
  id: number;
  name: string;
  position?: string | null;
  hierarchyId: number;
  processId: number;
  functionsVisible?: boolean;
};

type CollaboratorFunction = {
  id: number;
  collaboratorId: number;
  description: string;
  order?: number;
};

export default function OrganigramaScreen() {
  const [selectedHierarchyId, setSelectedHierarchyId] = useState<number | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<number | null>(null);

  // Add modals
  const [showAddHierarchy, setShowAddHierarchy] = useState(false);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showFunctionsModal, setShowFunctionsModal] = useState(false);

  // Edit modals
  const [showEditHierarchy, setShowEditHierarchy] = useState(false);
  const [editingHierarchy, setEditingHierarchy] = useState<Hierarchy | null>(null);
  const [editHierarchyName, setEditHierarchyName] = useState("");
  const [editHierarchyLevel, setEditHierarchyLevel] = useState(1);

  const [showEditCollaborator, setShowEditCollaborator] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [editCollaboratorName, setEditCollaboratorName] = useState("");
  const [editCollaboratorPosition, setEditCollaboratorPosition] = useState("");

  const [editingFunctionId, setEditingFunctionId] = useState<number | null>(null);
  const [editFunctionText, setEditFunctionText] = useState("");

  // Form state
  const [newHierarchyName, setNewHierarchyName] = useState("");
  const [newHierarchyLevel, setNewHierarchyLevel] = useState(1);
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [newCollaboratorPosition, setNewCollaboratorPosition] = useState("");
  const [newFunctionText, setNewFunctionText] = useState("");

  const hierarchiesQuery = trpc.hierarchy.list.useQuery();
  const collaboratorsQuery = trpc.collaborator.listAll.useQuery();

  const createHierarchy = trpc.hierarchy.create.useMutation({
    onSuccess: () => { hierarchiesQuery.refetch(); setShowAddHierarchy(false); setNewHierarchyName(""); },
  });

  const updateHierarchy = trpc.hierarchy.update.useMutation({
    onSuccess: () => { hierarchiesQuery.refetch(); setShowEditHierarchy(false); setEditingHierarchy(null); },
  });

  const deleteHierarchy = trpc.hierarchy.delete.useMutation({
    onSuccess: () => { hierarchiesQuery.refetch(); collaboratorsQuery.refetch(); setSelectedHierarchyId(null); },
  });

  const createCollaborator = trpc.collaborator.create.useMutation({
    onSuccess: () => { collaboratorsQuery.refetch(); setShowAddCollaborator(false); setNewCollaboratorName(""); setNewCollaboratorPosition(""); },
  });

  const updateCollaborator = trpc.collaborator.update.useMutation({
    onSuccess: () => { collaboratorsQuery.refetch(); setShowEditCollaborator(false); setEditingCollaborator(null); },
  });

  const deleteCollaborator = trpc.collaborator.delete.useMutation({
    onSuccess: () => { collaboratorsQuery.refetch(); setSelectedCollaboratorId(null); },
  });

  const functionsQuery = trpc.collaboratorFunction.list.useQuery(
    { collaboratorId: selectedCollaboratorId ?? 0 },
    { enabled: !!selectedCollaboratorId }
  );

  const createFunction = trpc.collaboratorFunction.create.useMutation({
    onSuccess: () => { functionsQuery.refetch(); setNewFunctionText(""); },
  });

  const updateFunction = trpc.collaboratorFunction.update.useMutation({
    onSuccess: () => { functionsQuery.refetch(); setEditingFunctionId(null); setEditFunctionText(""); },
  });

  const deleteFunction = trpc.collaboratorFunction.delete.useMutation({
    onSuccess: () => functionsQuery.refetch(),
  });

  const hierarchies: Hierarchy[] = hierarchiesQuery.data ?? [];
  const collaborators: Collaborator[] = collaboratorsQuery.data ?? [];

  const getLevelInfo = (level: number) => HIERARCHY_LEVELS.find(l => l.level === level) ?? HIERARCHY_LEVELS[4];

  const { alert } = useAppAlert();

  const handleAddHierarchy = () => {
    if (!newHierarchyName.trim()) {
      alert({ title: "Error", message: "Ingresa el nombre del cargo" });
      return;
    }
    createHierarchy.mutate({ name: newHierarchyName.trim(), level: newHierarchyLevel });
  };

  const handleEditHierarchy = (h: Hierarchy) => {
    setEditingHierarchy(h);
    setEditHierarchyName(h.name);
    setEditHierarchyLevel(h.level);
    setShowEditHierarchy(true);
  };

  const handleSaveEditHierarchy = () => {
    if (!editHierarchyName.trim() || !editingHierarchy) return;
    updateHierarchy.mutate({ id: editingHierarchy.id, name: editHierarchyName.trim(), level: editHierarchyLevel });
  };

  const handleAddCollaborator = () => {
    if (!newCollaboratorName.trim() || !selectedHierarchyId) {
      alert({ title: "Error", message: "Ingresa el nombre del colaborador" });
      return;
    }
    createCollaborator.mutate({
      hierarchyId: selectedHierarchyId,
      name: newCollaboratorName.trim(),
      position: newCollaboratorPosition.trim() || undefined,
    });
  };

  const handleEditCollaborator = (c: Collaborator) => {
    setEditingCollaborator(c);
    setEditCollaboratorName(c.name);
    setEditCollaboratorPosition(c.position ?? "");
    setShowEditCollaborator(true);
  };

  const handleSaveEditCollaborator = () => {
    if (!editCollaboratorName.trim() || !editingCollaborator) return;
    updateCollaborator.mutate({
      id: editingCollaborator.id,
      name: editCollaboratorName.trim(),
      position: editCollaboratorPosition.trim() || undefined,
    });
  };

  const handleAddFunction = () => {
    if (!newFunctionText.trim() || !selectedCollaboratorId) return;
    createFunction.mutate({ collaboratorId: selectedCollaboratorId, description: newFunctionText.trim() });
  };

  const handleSaveEditFunction = () => {
    if (!editFunctionText.trim() || !editingFunctionId) return;
    updateFunction.mutate({ id: editingFunctionId, description: editFunctionText.trim() });
  };

  const selectedCollaborator = collaborators.find(c => c.id === selectedCollaboratorId);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Organigrama del Área</Text>
          <Text style={styles.headerSubtitle}>Estructura jerárquica del equipo</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddHierarchy(true)}>
          <Text style={styles.addBtnText}>+ Cargo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {hierarchiesQuery.isLoading ? (
          <ActivityIndicator color="#CC2229" style={{ marginTop: 40 }} />
        ) : hierarchies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Sin cargos definidos</Text>
            <Text style={styles.emptyText}>Agrega los cargos del organigrama tocando "+ Cargo"</Text>
          </View>
        ) : (
          HIERARCHY_LEVELS.map(levelInfo => {
            const levelHierarchies = hierarchies.filter(h => h.level === levelInfo.level);
            if (levelHierarchies.length === 0) return null;
            return (
              <View key={levelInfo.level} style={styles.levelSection}>
                <View style={[styles.levelBadge, { backgroundColor: levelInfo.bgColor, borderColor: levelInfo.color }]}>
                  <Text style={[styles.levelLabel, { color: levelInfo.color }]}>
                    Nivel {levelInfo.level} — {levelInfo.label}
                  </Text>
                </View>
                {levelHierarchies.map(hierarchy => {
                  const hCollaborators = collaborators.filter(c => c.hierarchyId === hierarchy.id);
                  const isSelected = selectedHierarchyId === hierarchy.id;
                  return (
                    <View key={hierarchy.id} style={[styles.hierarchyCard, isSelected && { borderColor: levelInfo.color, borderWidth: 2 }]}>
                      <TouchableOpacity
                        style={styles.hierarchyHeader}
                        onPress={() => setSelectedHierarchyId(isSelected ? null : hierarchy.id)}
                      >
                        <View style={[styles.hierarchyDot, { backgroundColor: levelInfo.color }]} />
                        <Text style={styles.hierarchyName}>{hierarchy.name}</Text>
                        <View style={styles.hierarchyActions}>
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: levelInfo.bgColor }]}
                            onPress={() => {
                              setSelectedHierarchyId(hierarchy.id);
                              setShowAddCollaborator(true);
                            }}
                          >
                            <Text style={[styles.smallBtnText, { color: levelInfo.color }]}>+ Persona</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleEditHierarchy(hierarchy)}>
                            <Text style={styles.editIcon}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => alert({
                              title: "Eliminar",
                              message: `¿Eliminar "${hierarchy.name}" y sus colaboradores?`,
                              buttons: [
                                { text: "Cancelar", style: "cancel" },
                                { text: "Eliminar", style: "destructive", onPress: () => deleteHierarchy.mutate({ id: hierarchy.id }) },
                              ],
                            })}
                          >
                            <Text style={styles.deleteIcon}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      {hCollaborators.length > 0 && (
                        <View style={styles.collaboratorsList}>
                          {hCollaborators.map(collab => (
                            <View key={collab.id} style={styles.collaboratorItem}>
                              <View style={styles.collaboratorInfo}>
                                <Text style={styles.collaboratorName}>{collab.name}</Text>
                                {collab.position && <Text style={styles.collaboratorPosition}>{collab.position}</Text>}
                              </View>
                              <View style={styles.collaboratorActions}>
                                <TouchableOpacity
                                  style={styles.functionsBtn}
                                  onPress={() => {
                                    setSelectedCollaboratorId(collab.id);
                                    setShowFunctionsModal(true);
                                  }}
                                >
                                  <Text style={styles.functionsBtnText}>Funciones</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleEditCollaborator(collab)}>
                                  <Text style={styles.editIcon}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => alert({
                                    title: "Eliminar",
                                    message: `¿Eliminar a "${collab.name}"?`,
                                    buttons: [
                                      { text: "Cancelar", style: "cancel" },
                                      { text: "Eliminar", style: "destructive", onPress: () => deleteCollaborator.mutate({ id: collab.id }) },
                                    ],
                                  })}
                                >
                                  <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Hierarchy Modal */}
      <KeyboardModal
        visible={showAddHierarchy}
        onClose={() => { setShowAddHierarchy(false); setNewHierarchyName(""); }}
        title="Agregar Cargo"
      >
        <View style={styles.modalPadding}>
          <Text style={styles.inputLabel}>Nombre del Cargo</Text>
          <TextInput
            style={styles.input}
            value={newHierarchyName}
            onChangeText={setNewHierarchyName}
            placeholder="Ej: Director Comercial"
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="done"
          />
          <Text style={styles.inputLabel}>Nivel Jerárquico</Text>
          <View style={styles.levelSelector}>
            {HIERARCHY_LEVELS.map(l => (
              <TouchableOpacity
                key={l.level}
                style={[styles.levelOption, newHierarchyLevel === l.level && { backgroundColor: l.color }]}
                onPress={() => setNewHierarchyLevel(l.level)}
              >
                <Text style={[styles.levelOptionText, newHierarchyLevel === l.level && { color: "#FFF" }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowAddHierarchy(false); setNewHierarchyName(""); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddHierarchy} disabled={createHierarchy.isPending}>
              {createHierarchy.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Agregar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>

      {/* Edit Hierarchy Modal */}
      <KeyboardModal
        visible={showEditHierarchy}
        onClose={() => { setShowEditHierarchy(false); setEditingHierarchy(null); }}
        title="Editar Cargo"
      >
        <View style={styles.modalPadding}>
          <Text style={styles.inputLabel}>Nombre del Cargo</Text>
          <TextInput
            style={styles.input}
            value={editHierarchyName}
            onChangeText={setEditHierarchyName}
            placeholder="Ej: Director Comercial"
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="done"
          />
          <Text style={styles.inputLabel}>Nivel Jerárquico</Text>
          <View style={styles.levelSelector}>
            {HIERARCHY_LEVELS.map(l => (
              <TouchableOpacity
                key={l.level}
                style={[styles.levelOption, editHierarchyLevel === l.level && { backgroundColor: l.color }]}
                onPress={() => setEditHierarchyLevel(l.level)}
              >
                <Text style={[styles.levelOptionText, editHierarchyLevel === l.level && { color: "#FFF" }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowEditHierarchy(false); setEditingHierarchy(null); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveEditHierarchy} disabled={updateHierarchy.isPending}>
              {updateHierarchy.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>

      {/* Add Collaborator Modal */}
      <KeyboardModal
        visible={showAddCollaborator}
        onClose={() => { setShowAddCollaborator(false); setNewCollaboratorName(""); setNewCollaboratorPosition(""); }}
        title="Agregar Persona"
      >
        <View style={styles.modalPadding}>
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          <TextInput
            style={styles.input}
            value={newCollaboratorName}
            onChangeText={setNewCollaboratorName}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="next"
          />
          <Text style={styles.inputLabel}>Cargo / Posición (opcional)</Text>
          <TextInput
            style={styles.input}
            value={newCollaboratorPosition}
            onChangeText={setNewCollaboratorPosition}
            placeholder="Ej: Director Comercial"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowAddCollaborator(false); setNewCollaboratorName(""); setNewCollaboratorPosition(""); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddCollaborator} disabled={createCollaborator.isPending}>
              {createCollaborator.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Agregar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>

      {/* Edit Collaborator Modal */}
      <KeyboardModal
        visible={showEditCollaborator}
        onClose={() => { setShowEditCollaborator(false); setEditingCollaborator(null); }}
        title="Editar Persona"
      >
        <View style={styles.modalPadding}>
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          <TextInput
            style={styles.input}
            value={editCollaboratorName}
            onChangeText={setEditCollaboratorName}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="next"
          />
          <Text style={styles.inputLabel}>Cargo / Posición (opcional)</Text>
          <TextInput
            style={styles.input}
            value={editCollaboratorPosition}
            onChangeText={setEditCollaboratorPosition}
            placeholder="Ej: Director Comercial"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowEditCollaborator(false); setEditingCollaborator(null); }}>
              <Text style={styles.cancelModalText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveEditCollaborator} disabled={updateCollaborator.isPending}>
              {updateCollaborator.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>

      {/* Functions Modal */}
      <KeyboardModal
        visible={showFunctionsModal}
        onClose={() => { setShowFunctionsModal(false); setNewFunctionText(""); setEditingFunctionId(null); setEditFunctionText(""); }}
        title={`Funciones de ${selectedCollaborator?.name ?? ""}`}
      >
        <View style={styles.modalPadding}>
          <FlatList
            data={functionsQuery.data ?? []}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.functionItem}>
                {editingFunctionId === item.id ? (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.input, { minHeight: 50, marginBottom: 6 }]}
                      value={editFunctionText}
                      onChangeText={setEditFunctionText}
                      multiline
                      autoFocus
                    />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.cancelModalBtn, { flex: 1, paddingVertical: 8 }]}
                        onPress={() => { setEditingFunctionId(null); setEditFunctionText(""); }}
                      >
                        <Text style={styles.cancelModalText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveModalBtn, { flex: 1, paddingVertical: 8 }]}
                        onPress={handleSaveEditFunction}
                        disabled={updateFunction.isPending}
                      >
                        {updateFunction.isPending
                          ? <ActivityIndicator size="small" color="#FFF" />
                          : <Text style={styles.saveModalText}>Guardar</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.functionText}>• {item.description}</Text>
                    <TouchableOpacity onPress={() => { setEditingFunctionId(item.id); setEditFunctionText(item.description); }}>
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteFunction.mutate({ id: item.id })}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Sin funciones registradas</Text>}
            scrollEnabled={false}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.inputLabel}>NUEVA FUNCIÓN</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={newFunctionText}
            onChangeText={setNewFunctionText}
            placeholder="Describe la función del colaborador..."
            placeholderTextColor="#9CA3AF"
            multiline
            returnKeyType="done"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setShowFunctionsModal(false); setNewFunctionText(""); setEditingFunctionId(null); setEditFunctionText(""); }}>
              <Text style={styles.cancelModalText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddFunction} disabled={createFunction.isPending}>
              {createFunction.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveModalText}>Agregar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  addBtn: { backgroundColor: "#CC2229", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  levelSection: { marginBottom: 16 },
  levelBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8, alignSelf: "flex-start" },
  levelLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  hierarchyCard: { backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  hierarchyHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  hierarchyDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  hierarchyName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  hierarchyActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  smallBtnText: { fontSize: 12, fontWeight: "600" },
  editIcon: { fontSize: 16, padding: 4 },
  deleteIcon: { fontSize: 16, padding: 4 },
  collaboratorsList: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingHorizontal: 14, paddingBottom: 8 },
  collaboratorItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  collaboratorInfo: { flex: 1 },
  collaboratorName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  collaboratorPosition: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  collaboratorActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  functionsBtn: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  functionsBtnText: { fontSize: 12, fontWeight: "600", color: "#1B4F9B" },
  modalPadding: { paddingHorizontal: 20, paddingTop: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A2E", marginBottom: 14 },
  levelSelector: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  levelOption: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  levelOptionText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelModalBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  cancelModalText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
  saveModalBtn: { flex: 1, backgroundColor: "#CC2229", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  saveModalText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  functionItem: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  functionText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
});
