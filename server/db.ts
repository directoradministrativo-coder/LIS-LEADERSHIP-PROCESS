import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import {
  processes,
  orgHierarchies,
  orgCollaborators,
  collaboratorFunctions,
  kpis,
  dofaMatrix,
  processInteractions,
  interactionTasks,
  interactionStrengths,
  authorizedUsers,
  moduleObservations,
} from "../drizzle/schema";
import { and, ne } from "drizzle-orm";

// ============================================================
// PROCESSES
// ============================================================

export async function getOrCreateProcess(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(processes).values({ userId, processName: "" });
  const created = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  return created[0];
}

export async function updateProcess(userId: number, data: { processName?: string; areaName?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(processes).values({ userId, processName: data.processName ?? "", areaName: data.areaName });
  } else {
    await db.update(processes).set(data).where(eq(processes.userId, userId));
  }
  const updated = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  return updated[0];
}

// ============================================================
// HIERARCHIES
// ============================================================

export async function getHierarchies(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return [];

  return db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, process[0].id));
}

export async function createHierarchy(userId: number, data: { name: string; level: number; parentId?: number; isCustom?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  await db.insert(orgHierarchies).values({ ...data, processId: process.id, isCustom: data.isCustom ?? false });
  const created = await db.select().from(orgHierarchies)
    .where(and(eq(orgHierarchies.processId, process.id), eq(orgHierarchies.name, data.name)))
    .limit(1);
  return created[0];
}

export async function updateHierarchy(id: number, data: { name?: string; level?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgHierarchies).set(data).where(eq(orgHierarchies.id, id));
}

export async function deleteHierarchy(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const collabs = await db.select().from(orgCollaborators).where(eq(orgCollaborators.hierarchyId, id));
  for (const collab of collabs) {
    await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collab.id));
  }
  await db.delete(orgCollaborators).where(eq(orgCollaborators.hierarchyId, id));
  await db.delete(orgHierarchies).where(eq(orgHierarchies.id, id));
}

// ============================================================
// COLLABORATORS
// ============================================================

export async function getAllCollaborators(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return [];

  return db.select().from(orgCollaborators).where(eq(orgCollaborators.processId, process[0].id));
}

export async function createCollaborator(userId: number, data: { hierarchyId: number; name: string; position?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  await db.insert(orgCollaborators).values({ ...data, processId: process.id, functionsVisible: false });
  const created = await db.select().from(orgCollaborators)
    .where(and(eq(orgCollaborators.hierarchyId, data.hierarchyId), eq(orgCollaborators.name, data.name)))
    .limit(1);
  return created[0];
}

export async function updateCollaborator(id: number, data: { name?: string; position?: string; functionsVisible?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgCollaborators).set(data).where(eq(orgCollaborators.id, id));
}

export async function deleteCollaborator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, id));
  await db.delete(orgCollaborators).where(eq(orgCollaborators.id, id));
}

// ============================================================
// COLLABORATOR FUNCTIONS
// ============================================================

export async function getCollaboratorFunctions(collaboratorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collaboratorId));
}

export async function createCollaboratorFunction(data: { collaboratorId: number; description: string; order?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(collaboratorFunctions).values({ ...data, order: data.order ?? 0 });
}

export async function updateCollaboratorFunction(id: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(collaboratorFunctions).set({ description }).where(eq(collaboratorFunctions.id, id));
}

export async function deleteCollaboratorFunction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.id, id));
}

// ============================================================
// KPIs
// ============================================================

export async function getKPIs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return [];

  return db.select().from(kpis).where(eq(kpis.processId, process[0].id));
}

export async function createKPI(userId: number, data: { name: string; objective: string; frequency: "dia" | "semana" | "mes"; formula: string; responsible: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  await db.insert(kpis).values({ ...data, processId: process.id });
  const created = await db.select().from(kpis)
    .where(and(eq(kpis.processId, process.id), eq(kpis.name, data.name)))
    .limit(1);
  return created[0];
}

export async function updateKPI(id: number, data: Partial<{ name: string; objective: string; frequency: "dia" | "semana" | "mes"; formula: string; responsible: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kpis).set(data).where(eq(kpis.id, id));
}

export async function deleteKPI(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(kpis).where(eq(kpis.id, id));
}

// ============================================================
// DOFA
// ============================================================

export async function getDofa(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return null;

  const result = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, process[0].id)).limit(1);
  if (result.length === 0) return null;

  const row = result[0];
  return {
    ...row,
    debilidades: JSON.parse(row.debilidades || "[]") as string[],
    oportunidades: JSON.parse(row.oportunidades || "[]") as string[],
    fortalezas: JSON.parse(row.fortalezas || "[]") as string[],
    amenazas: JSON.parse(row.amenazas || "[]") as string[],
  };
}

export async function saveDofa(userId: number, data: { debilidades: string[]; oportunidades: string[]; fortalezas: string[]; amenazas: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  const serialized = {
    debilidades: JSON.stringify(data.debilidades),
    oportunidades: JSON.stringify(data.oportunidades),
    fortalezas: JSON.stringify(data.fortalezas),
    amenazas: JSON.stringify(data.amenazas),
  };

  const existing = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, process.id)).limit(1);
  if (existing.length === 0) {
    await db.insert(dofaMatrix).values({ processId: process.id, ...serialized });
  } else {
    await db.update(dofaMatrix).set(serialized).where(eq(dofaMatrix.processId, process.id));
  }
}

// ============================================================
// PROCESS INTERACTIONS
// ============================================================

export async function getInteractions(userId: number, type: "proveedor" | "cliente") {
  const db = await getDb();
  if (!db) return [];

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return [];

  return db.select().from(processInteractions)
    .where(and(eq(processInteractions.processId, process[0].id), eq(processInteractions.type, type)));
}

export async function createInteraction(userId: number, data: { type: "proveedor" | "cliente"; relatedProcessName: string; isCustomProcess?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  await db.insert(processInteractions).values({ ...data, processId: process.id, isCustomProcess: data.isCustomProcess ?? false });
  const created = await db.select().from(processInteractions)
    .where(and(eq(processInteractions.processId, process.id), eq(processInteractions.relatedProcessName, data.relatedProcessName), eq(processInteractions.type, data.type)))
    .limit(1);
  return created[0];
}

export async function deleteInteraction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(interactionStrengths).where(eq(interactionStrengths.interactionId, id));
  await db.delete(interactionTasks).where(eq(interactionTasks.interactionId, id));
  await db.delete(processInteractions).where(eq(processInteractions.id, id));
}

// ============================================================
// INTERACTION TASKS
// ============================================================

export async function getInteractionTasks(interactionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interactionTasks).where(eq(interactionTasks.interactionId, interactionId));
}

export async function createInteractionTask(data: {
  interactionId: number;
  taskActivity: string;
  documentRoute: string;
  responsibleRole: string;
  ansUndefined: boolean;
  ansNumber?: number;
  ansType?: "dias_calendario" | "dias_habiles" | "semanas" | "meses";
  ansCompliance?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(interactionTasks).values(data);
}

export async function updateInteractionTask(id: number, data: Partial<{
  taskActivity: string;
  documentRoute: string;
  responsibleRole: string;
  ansUndefined: boolean;
  ansNumber: number | null;
  ansType: "dias_calendario" | "dias_habiles" | "semanas" | "meses" | null;
  ansCompliance: number | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(interactionTasks).set(data).where(eq(interactionTasks.id, id));
}

export async function deleteInteractionTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(interactionTasks).where(eq(interactionTasks.id, id));
}

// ============================================================
// INTERACTION STRENGTHS
// ============================================================

export async function getInteractionStrengths(interactionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interactionStrengths).where(eq(interactionStrengths.interactionId, interactionId));
}

export async function createInteractionStrength(data: { interactionId: number; type: "fortaleza" | "oportunidad"; description: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(interactionStrengths).values(data);
}

export async function deleteInteractionStrength(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(interactionStrengths).where(eq(interactionStrengths.id, id));
}

// ============================================================
// EXPORT DATA
// ============================================================

export async function getOrgChartExportData(userId: number) {
  const db = await getDb();
  if (!db) return { process: null, hierarchies: [], collaborators: [], functions: [] };

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return { process: null, hierarchies: [], collaborators: [], functions: [] };

  const hierarchies = await db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, process[0].id));
  const collaborators = await db.select().from(orgCollaborators).where(eq(orgCollaborators.processId, process[0].id));
  const allFunctions: (typeof collaboratorFunctions.$inferSelect)[] = [];
  for (const collab of collaborators) {
    const funcs = await db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collab.id));
    allFunctions.push(...funcs);
  }

  return { process: process[0], hierarchies, collaborators, functions: allFunctions };
}

export async function getKPIsExportData(userId: number) {
  const db = await getDb();
  if (!db) return { process: null, kpis: [] };

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return { process: null, kpis: [] };

  const kpiList = await db.select().from(kpis).where(eq(kpis.processId, process[0].id));
  return { process: process[0], kpis: kpiList };
}

export async function getDofaExportData(userId: number) {
  const process = await getOrCreateProcess(userId);
  const dofa = await getDofa(userId);
  return { process, dofa };
}

export async function getInteractionsExportData(userId: number) {
  const db = await getDb();
  if (!db) return { process: null, interactions: [] };

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return { process: null, interactions: [] };

  const interactions = await db.select().from(processInteractions).where(eq(processInteractions.processId, process[0].id));
  const result = [];
  for (const interaction of interactions) {
    const tasks = await db.select().from(interactionTasks).where(eq(interactionTasks.interactionId, interaction.id));
    const strengths = await db.select().from(interactionStrengths).where(eq(interactionStrengths.interactionId, interaction.id));
    result.push({ ...interaction, tasks, strengths });
  }

  return { process: process[0], interactions: result };
}

// ============================================================
// AUTHORIZED USERS (Lista cerrada)
// ============================================================

export async function getAuthorizedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(authorizedUsers);
}

export async function getAuthorizedUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createAuthorizedUser(data: { email: string; name: string; areaName?: string; role?: "user" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(authorizedUsers).values({
    email: data.email.toLowerCase(),
    name: data.name,
    areaName: data.areaName,
    role: data.role ?? "user",
  });
  const created = await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, data.email.toLowerCase())).limit(1);
  return created[0];
}

export async function updateAuthorizedUser(id: number, data: Partial<{ name: string; areaName: string; role: "user" | "admin"; isEnrolled: boolean; enrolledAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(authorizedUsers).set(data).where(eq(authorizedUsers.id, id));
}

export async function deleteAuthorizedUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(authorizedUsers).where(eq(authorizedUsers.id, id));
}

export async function markUserAsEnrolled(email: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(authorizedUsers)
    .set({ isEnrolled: true, enrolledAt: new Date() })
    .where(eq(authorizedUsers.email, email.toLowerCase()));
}

// ============================================================
// MODULE OBSERVATIONS
// ============================================================

export async function getModuleObservation(userId: number, module: "kpi" | "proveedor" | "cliente" | "dofa" | "organigrama") {
  const db = await getDb();
  if (!db) return null;
  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return null;
  const result = await db.select().from(moduleObservations)
    .where(and(eq(moduleObservations.processId, process[0].id), eq(moduleObservations.module, module)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveModuleObservation(userId: number, module: "kpi" | "proveedor" | "cliente" | "dofa" | "organigrama", observations: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const process = await getOrCreateProcess(userId);
  const existing = await db.select().from(moduleObservations)
    .where(and(eq(moduleObservations.processId, process.id), eq(moduleObservations.module, module)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(moduleObservations).values({ processId: process.id, module, observations });
  } else {
    await db.update(moduleObservations).set({ observations }).where(eq(moduleObservations.id, existing[0].id));
  }
}

// ============================================================
// ADMIN: All processes data
// ============================================================

export async function getAllProcessesData() {
  const db = await getDb();
  if (!db) return [];

  const allProcesses = await db.select().from(processes);
  const result = [];

  for (const process of allProcesses) {
    const user = await db.select().from(users).where(eq(users.id, process.userId)).limit(1);
    const hierarchies = await db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, process.id));
    const collaborators = await db.select().from(orgCollaborators).where(eq(orgCollaborators.processId, process.id));
    const kpiList = await db.select().from(kpis).where(eq(kpis.processId, process.id));
    const dofaRow = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, process.id)).limit(1);
    const interactions = await db.select().from(processInteractions).where(eq(processInteractions.processId, process.id));

    result.push({
      process,
      user: user[0] ?? null,
      hierarchies,
      collaborators,
      kpis: kpiList,
      dofa: dofaRow.length > 0 ? {
        ...dofaRow[0],
        debilidades: JSON.parse(dofaRow[0].debilidades || "[]") as string[],
        oportunidades: JSON.parse(dofaRow[0].oportunidades || "[]") as string[],
        fortalezas: JSON.parse(dofaRow[0].fortalezas || "[]") as string[],
        amenazas: JSON.parse(dofaRow[0].amenazas || "[]") as string[],
      } : null,
      interactions,
    });
  }

  return result;
}
