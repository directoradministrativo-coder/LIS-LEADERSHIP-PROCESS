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
  projects,
  appConfig,
  auditLog,
  processNotifications,
} from "../drizzle/schema";
import { and, ne, desc, sql } from "drizzle-orm";

// ============================================================
// AUDIT LOG HELPERS
// ============================================================

interface AuditContext {
  userId?: number;
  userName?: string;
  userEmail?: string;
  processId?: number;
  processName?: string;
}

export async function writeAuditLog(
  tableName: string,
  recordId: number,
  action: "create" | "update" | "delete",
  oldData: any,
  newData: any,
  description: string,
  ctx: AuditContext = {}
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLog).values({
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      userId: ctx.userId ?? null,
      userName: ctx.userName ?? null,
      userEmail: ctx.userEmail ?? null,
      processId: ctx.processId ?? null,
      processName: ctx.processName ?? null,
      description,
      isRestored: false,
    });
  } catch (e) {
    // Audit failures must never break the main operation
    console.warn("[Audit] Failed to write audit log:", e);
  }
}

export async function getAuditLogs(filters: {
  tableName?: string;
  action?: "create" | "update" | "delete";
  processId?: number;
  processName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };

  const conditions: any[] = [];
  if (filters.tableName) conditions.push(eq(auditLog.tableName, filters.tableName));
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.processId) conditions.push(eq(auditLog.processId, filters.processId));
  if (filters.processName) conditions.push(eq(auditLog.processName, filters.processName));
  if (filters.dateFrom) conditions.push(sql`${auditLog.createdAt} >= ${new Date(filters.dateFrom)}`);
  if (filters.dateTo) {
    // Include the entire day of dateTo by setting time to end of day
    const endOfDay = new Date(filters.dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(sql`${auditLog.createdAt} <= ${endOfDay}`);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const query = db.select().from(auditLog);
  const withWhere = conditions.length > 0 ? query.where(and(...conditions)) : query;
  const logs = await withWhere.orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLog);
  const withWhereCount = conditions.length > 0 ? countQuery.where(and(...conditions)) : countQuery;
  const countResult = await withWhereCount;
  const total = Number(countResult[0]?.count ?? 0);

  return { logs, total };
}

export async function getAuditProcessNames() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ processName: auditLog.processName })
    .from(auditLog)
    .where(sql`${auditLog.processName} IS NOT NULL`);
  return rows.map((r) => r.processName).filter(Boolean) as string[];
}

export async function markAuditRestored(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(auditLog).set({ isRestored: true }).where(eq(auditLog.id, id));
}

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

export async function updateHierarchy(id: number, data: { name?: string; level?: number }, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(orgHierarchies).where(eq(orgHierarchies.id, id)).limit(1);
  await db.update(orgHierarchies).set(data).where(eq(orgHierarchies.id, id));
  if (snap.length > 0) {
    await writeAuditLog("orgHierarchies", id, "update", snap[0], { ...snap[0], ...data },
      `Modificó cargo/nivel "${snap[0].name}"`, ctx);
  }
}

export async function deleteHierarchy(id: number, ctx: { userId?: number; userName?: string; userEmail?: string; processId?: number; processName?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Snapshot before delete for audit
  const hierarchySnap = await db.select().from(orgHierarchies).where(eq(orgHierarchies.id, id)).limit(1);
  const collabs = await db.select().from(orgCollaborators).where(eq(orgCollaborators.hierarchyId, id));
  const allFunctions: any[] = [];
  for (const collab of collabs) {
    const funcs = await db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collab.id));
    allFunctions.push(...funcs);
    await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collab.id));
  }
  await db.delete(orgCollaborators).where(eq(orgCollaborators.hierarchyId, id));
  await db.delete(orgHierarchies).where(eq(orgHierarchies.id, id));

  // Write audit log after delete
  if (hierarchySnap.length > 0) {
    const snap = hierarchySnap[0];
    await writeAuditLog(
      "orgHierarchies", id, "delete",
      { hierarchy: snap, collaborators: collabs, functions: allFunctions },
      null,
      `Eliminó cargo/nivel "${snap.name}" del organigrama con ${collabs.length} colaborador(es)`,
      ctx
    );
  }
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

export async function updateCollaborator(id: number, data: { name?: string; position?: string; functionsVisible?: boolean }, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(orgCollaborators).where(eq(orgCollaborators.id, id)).limit(1);
  await db.update(orgCollaborators).set(data).where(eq(orgCollaborators.id, id));
  if (snap.length > 0 && (data.name !== undefined || data.position !== undefined)) {
    await writeAuditLog("orgCollaborators", id, "update", snap[0], { ...snap[0], ...data },
      `Modificó colaborador "${snap[0].name}"`, ctx);
  }
}

export async function deleteCollaborator(id: number, ctx: { userId?: number; userName?: string; userEmail?: string; processId?: number; processName?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(orgCollaborators).where(eq(orgCollaborators.id, id)).limit(1);
  const funcs = await db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, id));
  await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, id));
  await db.delete(orgCollaborators).where(eq(orgCollaborators.id, id));
  if (snap.length > 0) {
    await writeAuditLog("orgCollaborators", id, "delete", { collaborator: snap[0], functions: funcs }, null,
      `Eliminó colaborador "${snap[0].name}" del organigrama`, ctx);
  }
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

export async function updateCollaboratorFunction(id: number, description: string, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.id, id)).limit(1);
  await db.update(collaboratorFunctions).set({ description }).where(eq(collaboratorFunctions.id, id));
  if (snap.length > 0) {
    await writeAuditLog("collaboratorFunctions", id, "update", snap[0], { ...snap[0], description },
      `Modificó función de colaborador`, ctx);
  }
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

export async function updateKPI(id: number, data: Partial<{ name: string; objective: string; frequency: "dia" | "semana" | "mes"; formula: string; responsible: string }>, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(kpis).where(eq(kpis.id, id)).limit(1);
  await db.update(kpis).set(data).where(eq(kpis.id, id));
  if (snap.length > 0) {
    await writeAuditLog("kpis", id, "update", snap[0], { ...snap[0], ...data },
      `Modificó KPI "${snap[0].name}"`, ctx);
  }
}

export async function deleteKPI(id: number, ctx: { userId?: number; userName?: string; userEmail?: string; processId?: number; processName?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(kpis).where(eq(kpis.id, id)).limit(1);
  await db.delete(kpis).where(eq(kpis.id, id));
  if (snap.length > 0) {
    await writeAuditLog("kpis", id, "delete", snap[0], null,
      `Eliminó KPI "${snap[0].name}"`, ctx);
  }
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

export async function saveDofa(userId: number, data: { debilidades: string[]; oportunidades: string[]; fortalezas: string[]; amenazas: string[] }, ctx: AuditContext = {}) {
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
    await writeAuditLog(
      "dofaMatrix", process.id, "create", null, data,
      `Creó la matriz DOFA (${data.debilidades.length} debilidades, ${data.fortalezas.length} fortalezas, ${data.oportunidades.length} oportunidades, ${data.amenazas.length} amenazas)`,
      { ...ctx, processId: ctx.processId ?? process.id, processName: ctx.processName ?? process.processName ?? "Proceso" }
    );
  } else {
    const oldRecord = existing[0];
    const oldData = {
      debilidades: JSON.parse(oldRecord.debilidades || "[]"),
      oportunidades: JSON.parse(oldRecord.oportunidades || "[]"),
      fortalezas: JSON.parse(oldRecord.fortalezas || "[]"),
      amenazas: JSON.parse(oldRecord.amenazas || "[]"),
    };
    await db.update(dofaMatrix).set(serialized).where(eq(dofaMatrix.processId, process.id));
    await writeAuditLog(
      "dofaMatrix", process.id, "update", oldData, data,
      `Actualizó la matriz DOFA`,
      { ...ctx, processId: ctx.processId ?? process.id, processName: ctx.processName ?? process.processName ?? "Proceso" }
    );
  }
}

// Admin: save DOFA by processId (for admin editing other users' DOFA)
export async function saveDofaByProcessId(processId: number, data: { debilidades: string[]; oportunidades: string[]; fortalezas: string[]; amenazas: string[] }, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const proc = await db.select().from(processes).where(eq(processes.id, processId)).limit(1);
  if (proc.length === 0) throw new Error("Process not found");
  const serialized = {
    debilidades: JSON.stringify(data.debilidades),
    oportunidades: JSON.stringify(data.oportunidades),
    fortalezas: JSON.stringify(data.fortalezas),
    amenazas: JSON.stringify(data.amenazas),
  };
  const existing = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, processId)).limit(1);
  if (existing.length === 0) {
    await db.insert(dofaMatrix).values({ processId, ...serialized });
    await writeAuditLog(
      "dofaMatrix", processId, "create", null, data,
      `Admin creó la matriz DOFA (${data.debilidades.length} debilidades, ${data.fortalezas.length} fortalezas, ${data.oportunidades.length} oportunidades, ${data.amenazas.length} amenazas)`,
      { ...ctx, processId, processName: ctx.processName ?? proc[0].processName ?? "Proceso" }
    );
  } else {
    const oldRecord = existing[0];
    const oldData = {
      debilidades: JSON.parse(oldRecord.debilidades || "[]"),
      oportunidades: JSON.parse(oldRecord.oportunidades || "[]"),
      fortalezas: JSON.parse(oldRecord.fortalezas || "[]"),
      amenazas: JSON.parse(oldRecord.amenazas || "[]"),
    };
    await db.update(dofaMatrix).set(serialized).where(eq(dofaMatrix.processId, processId));
    await writeAuditLog(
      "dofaMatrix", processId, "update", oldData, data,
      `Admin actualizó la matriz DOFA`,
      { ...ctx, processId, processName: ctx.processName ?? proc[0].processName ?? "Proceso" }
    );
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

export async function deleteInteraction(id: number, ctx: { userId?: number; userName?: string; userEmail?: string; processId?: number; processName?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(processInteractions).where(eq(processInteractions.id, id)).limit(1);
  const tasks = await db.select().from(interactionTasks).where(eq(interactionTasks.interactionId, id));
  const strengths = await db.select().from(interactionStrengths).where(eq(interactionStrengths.interactionId, id));
  await db.delete(interactionStrengths).where(eq(interactionStrengths.interactionId, id));
  await db.delete(interactionTasks).where(eq(interactionTasks.interactionId, id));
  await db.delete(processInteractions).where(eq(processInteractions.id, id));
  if (snap.length > 0) {
    await writeAuditLog("processInteractions", id, "delete",
      { interaction: snap[0], tasks, strengths }, null,
      `Eliminó interacción con "${snap[0].relatedProcessName}" (${snap[0].type})`, ctx);
  }
}

export async function updateInteraction(id: number, data: { relatedProcessName: string; isCustomProcess?: boolean }, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(processInteractions).where(eq(processInteractions.id, id)).limit(1);
  await db.update(processInteractions).set({
    relatedProcessName: data.relatedProcessName,
    isCustomProcess: data.isCustomProcess ?? false,
    updatedAt: new Date(),
  }).where(eq(processInteractions.id, id));
  if (snap.length > 0) {
    await writeAuditLog("processInteractions", id, "update", snap[0], { ...snap[0], ...data },
      `Modificó interacción con "${snap[0].relatedProcessName}" → "${data.relatedProcessName}"`, ctx);
  }
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
}>, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(interactionTasks).where(eq(interactionTasks.id, id)).limit(1);
  await db.update(interactionTasks).set(data).where(eq(interactionTasks.id, id));
  if (snap.length > 0) {
    await writeAuditLog("interactionTasks", id, "update", snap[0], { ...snap[0], ...data },
      `Modificó tarea/actividad "${snap[0].taskActivity?.substring(0, 50)}"`, ctx);
  }
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

export async function updateInteractionStrength(id: number, description: string, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(interactionStrengths).where(eq(interactionStrengths.id, id)).limit(1);
  await db.update(interactionStrengths).set({ description }).where(eq(interactionStrengths.id, id));
  if (snap.length > 0) {
    await writeAuditLog("interactionStrengths", id, "update", snap[0], { ...snap[0], description },
      `Modificó fortaleza/oportunidad en interacciones`, ctx);
  }
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

export async function createAuthorizedUser(data: { email: string; name: string; areaName?: string; role?: "user" | "admin" | "superadmin" }) {
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

export async function updateAuthorizedUser(id: number, data: Partial<{ name: string; areaName: string; role: "user" | "admin" | "superadmin"; isEnrolled: boolean; enrolledAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(authorizedUsers).set(data).where(eq(authorizedUsers.id, id));
}

export async function syncUserRole(userId: number, role: "user" | "admin" | "superadmin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
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
    // Load functions for each collaborator
    const allFunctions: any[] = [];
    for (const collab of collaborators) {
      const funcs = await db.select().from(collaboratorFunctions).where(eq(collaboratorFunctions.collaboratorId, collab.id));
      allFunctions.push(...funcs);
    }
    const kpiList = await db.select().from(kpis).where(eq(kpis.processId, process.id));
    const dofaRow = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, process.id)).limit(1);
    const interactionRows = await db.select().from(processInteractions).where(eq(processInteractions.processId, process.id));
    // Load tasks and strengths for each interaction
    const interactionsWithDetails = [];
    for (const interaction of interactionRows) {
      const iTasks = await db.select().from(interactionTasks).where(eq(interactionTasks.interactionId, interaction.id));
      const iStrengths = await db.select().from(interactionStrengths).where(eq(interactionStrengths.interactionId, interaction.id));
      interactionsWithDetails.push({ ...interaction, tasks: iTasks, strengths: iStrengths });
    }
    // Load projects
    const projectList = await db.select().from(projects).where(eq(projects.processId, process.id));
    result.push({
      process,
      user: user[0] ?? null,
      hierarchies,
      collaborators,
      functions: allFunctions,
      kpis: kpiList,
      dofa: dofaRow.length > 0 ? {
        ...dofaRow[0],
        debilidades: JSON.parse(dofaRow[0].debilidades || "[]") as string[],
        oportunidades: JSON.parse(dofaRow[0].oportunidades || "[]") as string[],
        fortalezas: JSON.parse(dofaRow[0].fortalezas || "[]") as string[],
        amenazas: JSON.parse(dofaRow[0].amenazas || "[]") as string[],
      } : null,
      interactions: interactionsWithDetails,
      projects: projectList,
    });
  }

  return result;
}

// ─── Module Progress ──────────────────────────────────────────────────────────

export async function getModuleProgress(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (!process.length) {
    return {
      organigrama: false,
      kpis: false,
      dofa: false,
      proveedores: false,
      clientes: false,
      proyectos: false,
      completedCount: 0,
      totalCount: 6,
    };
  }

  const processId = process[0].id;

  const [hierarchyRows, kpiRows, dofaRows, proveedorRows, clienteRows, projectRows] = await Promise.all([
    db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, processId)).limit(1),
    db.select().from(kpis).where(eq(kpis.processId, processId)).limit(1),
    db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, processId)).limit(1),
    db.select().from(processInteractions).where(
      and(eq(processInteractions.processId, processId), eq(processInteractions.type, "proveedor"))
    ).limit(1),
    db.select().from(processInteractions).where(
      and(eq(processInteractions.processId, processId), eq(processInteractions.type, "cliente"))
    ).limit(1),
    db.select().from(projects).where(eq(projects.processId, processId)).limit(1),
  ]);

  const status = {
    organigrama: hierarchyRows.length > 0,
    kpis: kpiRows.length > 0,
    dofa: dofaRows.length > 0,
    proveedores: proveedorRows.length > 0,
    clientes: clienteRows.length > 0,
    proyectos: projectRows.length > 0,
  };

  const completedCount = Object.values(status).filter(Boolean).length;

  return {
    ...status,
    completedCount,
    totalCount: 6,
  };
}

// ─── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return [];

  return db.select().from(projects)
    .where(eq(projects.processId, process[0].id))
    .orderBy(desc(projects.subtotal));
}

export async function createProject(userId: number, data: {
  name: string;
  description: string;
  impact: number;
  difficulty: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const process = await getOrCreateProcess(userId);
  const subtotal = data.impact * data.difficulty;
  await db.insert(projects).values({
    processId: process.id,
    name: data.name,
    description: data.description,
    impact: data.impact,
    difficulty: data.difficulty,
    subtotal,
    status: "por_priorizar",
    hasNotification: false,
  });
  const created = await db.select().from(projects)
    .where(and(eq(projects.processId, process.id), eq(projects.name, data.name)))
    .orderBy(desc(projects.createdAt))
    .limit(1);
  return created[0];
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateProject(id: number, data: Partial<{
  name: string;
  description: string;
  impact: number;
  difficulty: number;
  subtotal: number;
  status: "por_priorizar" | "en_ejecucion" | "finalizado" | "suspendido" | "cancelado";
  statusObservations: string | null;
  hasNotification: boolean;
  notificationMessage: string | null;
  adminModifiedAt: Date | null;
}>, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Only run update if there are fields to set
  if (Object.keys(data).length > 0) {
    const snap = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    await db.update(projects).set(data).where(eq(projects.id, id));
    if (snap.length > 0 && ctx.userId) {
      const proj = snap[0];
      await writeAuditLog("projects", id, "update", proj, { ...proj, ...data },
        `Modificó proyecto "${proj.name}"`, ctx);
    }
  }
  const updated = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return updated[0];
}

export async function deleteProject(id: number, ctx: { userId?: number; userName?: string; userEmail?: string; processId?: number; processName?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snap = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  await db.delete(projects).where(eq(projects.id, id));
  if (snap.length > 0) {
    await writeAuditLog("projects", id, "delete", snap[0], null,
      `Eliminó proyecto "${snap[0].name}"`, ctx);
  }
}

export async function dismissProjectNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects)
    .set({ hasNotification: false, notificationMessage: null })
    .where(eq(projects.id, id));
}

// Admin: get all projects across all areas
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];

  const allProjects = await db.select().from(projects).orderBy(desc(projects.subtotal));
  const result = [];

  for (const project of allProjects) {
    const process = await db.select().from(processes).where(eq(processes.id, project.processId)).limit(1);
    const user = process.length > 0 ? await db.select().from(users).where(eq(users.id, process[0].userId)).limit(1) : [];
    const authUser = user.length > 0 && user[0].email
      ? await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, user[0].email)).limit(1)
      : [];

    result.push({
      ...project,
      processName: process[0]?.processName ?? "",
      areaName: process[0]?.areaName ?? authUser[0]?.areaName ?? "",
      leaderName: authUser[0]?.name ?? user[0]?.name ?? "",
      leaderEmail: user[0]?.email ?? "",
    });
  }

  return result;
}

// Admin: update project status and optionally notify leader
export async function adminUpdateProject(projectId: number, data: {
  impact?: number;
  difficulty?: number;
  status?: "por_priorizar" | "en_ejecucion" | "finalizado" | "suspendido" | "cancelado";
  statusObservations?: string | null;
  notificationMessage?: string;
}, ctx: AuditContext = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const snap = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const updateData: Parameters<typeof db.update>[0] extends infer T ? Partial<typeof projects.$inferInsert> : never = {};
  if (data.impact !== undefined) {
    updateData.impact = data.impact;
    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty;
      updateData.subtotal = data.impact * data.difficulty;
    }
  }
  if (data.difficulty !== undefined && data.impact === undefined) {
    const current = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (current.length > 0) {
      updateData.difficulty = data.difficulty;
      updateData.subtotal = current[0].impact * data.difficulty;
    }
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.statusObservations !== undefined) updateData.statusObservations = data.statusObservations;
  if (data.notificationMessage) {
    updateData.hasNotification = true;
    updateData.notificationMessage = data.notificationMessage;
    updateData.adminModifiedAt = new Date();
  }

  await db.update(projects).set(updateData).where(eq(projects.id, projectId));
  const updated = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (snap.length > 0 && updated.length > 0) {
    const changes: string[] = [];
    if (data.impact !== undefined && data.impact !== snap[0].impact) changes.push(`Impacto: ${snap[0].impact}→${data.impact}`);
    if (data.difficulty !== undefined && data.difficulty !== snap[0].difficulty) changes.push(`Dificultad: ${snap[0].difficulty}→${data.difficulty}`);
    if (data.status !== undefined && data.status !== snap[0].status) changes.push(`Estado: ${snap[0].status}→${data.status}`);
    const desc = changes.length > 0
      ? `Admin modificó proyecto "${snap[0].name}": ${changes.join(', ')}`
      : `Admin actualizó proyecto "${snap[0].name}"`;
    await writeAuditLog("projects", projectId, "update", snap[0], updated[0], desc, ctx);
  }

  return updated[0];
}

// ─── App Config ──────────────────────────────────────────────────────────────

export async function getConfig(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  if (existing.length === 0) {
    await db.insert(appConfig).values({ key, value });
  } else {
    await db.update(appConfig).set({ value }).where(eq(appConfig.key, key));
  }
}

// ─── Admin: Consolidated Progress ────────────────────────────────────────────

export async function getConsolidatedProgress() {
  const db = await getDb();
  if (!db) return [];

  // Get all authorized users with role=user
  const authorizedUsersList = await db.select().from(authorizedUsers);
  const result = [];

  for (const authUser of authorizedUsersList) {
    // Find the user in the users table
    const userRow = authUser.isEnrolled
      ? await db.select().from(users).where(eq(users.email, authUser.email)).limit(1)
      : [];

    if (userRow.length === 0) {
      // User hasn't logged in yet
      result.push({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        areaName: authUser.areaName ?? "",
        role: authUser.role,
        isEnrolled: authUser.isEnrolled,
        organigrama: false,
        kpis: false,
        dofa: false,
        proveedores: false,
        clientes: false,
        proyectos: false,
        completedCount: 0,
        totalCount: 6,
        lastUpdated: null,
      });
      continue;
    }

    const userId = userRow[0].id;
    const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);

    if (process.length === 0) {
      result.push({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        areaName: authUser.areaName ?? "",
        role: authUser.role,
        isEnrolled: authUser.isEnrolled,
        organigrama: false,
        kpis: false,
        dofa: false,
        proveedores: false,
        clientes: false,
        proyectos: false,
        completedCount: 0,
        totalCount: 6,
        lastUpdated: null,
      });
      continue;
    }

    const processId = process[0].id;
    const [hierarchyRows, kpiRows, dofaRows, proveedorRows, clienteRows, projectRows] = await Promise.all([
      db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, processId)).limit(1),
      db.select().from(kpis).where(eq(kpis.processId, processId)).limit(1),
      db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, processId)).limit(1),
      db.select().from(processInteractions).where(
        and(eq(processInteractions.processId, processId), eq(processInteractions.type, "proveedor"))
      ).limit(1),
      db.select().from(processInteractions).where(
        and(eq(processInteractions.processId, processId), eq(processInteractions.type, "cliente"))
      ).limit(1),
      db.select().from(projects).where(eq(projects.processId, processId)).limit(1),
    ]);

    const status = {
      organigrama: hierarchyRows.length > 0,
      kpis: kpiRows.length > 0,
      dofa: dofaRows.length > 0,
      proveedores: proveedorRows.length > 0,
      clientes: clienteRows.length > 0,
      proyectos: projectRows.length > 0,
    };

    const completedCount = Object.values(status).filter(Boolean).length;

    result.push({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      areaName: authUser.areaName ?? "",
      role: authUser.role,
      isEnrolled: authUser.isEnrolled,
      ...status,
      completedCount,
      totalCount: 6,
      lastUpdated: process[0].updatedAt,
    });
  }

  // Sort by completedCount descending
  return result.sort((a, b) => b.completedCount - a.completedCount);
}

// Export projects data for Excel
export async function getProjectsExportData(userId: number) {
  const db = await getDb();
  if (!db) return { process: null, projects: [] };

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return { process: null, projects: [] };

  const projectList = await db.select().from(projects)
    .where(eq(projects.processId, process[0].id))
    .orderBy(desc(projects.subtotal));
  return { process: process[0], projects: projectList };
}

// ─── Restore from Audit Log ───────────────────────────────────────────────────

/**
 * Sanitize fields from JSON snapshot before passing to Drizzle update/insert.
 * - Converts ISO date strings to Date objects for timestamp columns
 * - Removes auto-generated fields (id, createdAt, updatedAt) that shouldn't be set manually
 */
function sanitizeRestoreFields(fields: Record<string, any>, removeTimestamps = true): Record<string, any> {
  const autoFields = removeTimestamps ? ["id", "createdAt", "updatedAt"] : ["id"];
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (autoFields.includes(key)) continue;
    // Convert ISO date strings to Date objects
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function restoreAuditRecord(
  auditId: number,
  ctx: { userId?: number; userName?: string; userEmail?: string } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch the audit log entry
  const entry = await db.select().from(auditLog).where(eq(auditLog.id, auditId)).limit(1);
  if (entry.length === 0) throw new Error("Audit record not found");

  const record = entry[0];

  // ── Handle UPDATE: revert to oldData ──────────────────────────────────────
  if (record.action === "update") {
    if (!record.oldData) throw new Error("No previous snapshot available for this update");
    const oldData = JSON.parse(record.oldData);
    const fieldsToRestore = sanitizeRestoreFields(oldData);
    const recordId = record.recordId;

    const currentData = JSON.parse(record.newData ?? "{}");
    switch (record.tableName) {
      case "kpis":
        await db.update(kpis).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(kpis.id, recordId));
        await writeAuditLog("kpis", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió KPI al estado anterior desde historial`, ctx);
        break;
      case "projects":
        await db.update(projects).set({ ...sanitizeRestoreFields(fieldsToRestore, false), hasNotification: true, notificationMessage: "El administrador revirtió cambios en este proyecto" }).where(eq(projects.id, recordId));
        await writeAuditLog("projects", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió proyecto al estado anterior desde historial`, ctx);
        break;
      case "orgCollaborators":
        await db.update(orgCollaborators).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(orgCollaborators.id, recordId));
        await writeAuditLog("orgCollaborators", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió colaborador al estado anterior desde historial`, ctx);
        break;
      case "orgHierarchies":
        await db.update(orgHierarchies).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(orgHierarchies.id, recordId));
        await writeAuditLog("orgHierarchies", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió cargo/nivel al estado anterior desde historial`, ctx);
        break;
      case "interactionTasks":
      case "kpiValues":
        await db.update(interactionTasks).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(interactionTasks.id, recordId));
        await writeAuditLog("interactionTasks", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió tarea al estado anterior desde historial`, ctx);
        break;
      case "interactionStrengths":
        await db.update(interactionStrengths).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(interactionStrengths.id, recordId));
        await writeAuditLog("interactionStrengths", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió fortaleza/oportunidad al estado anterior desde historial`, ctx);
        break;
      case "collaboratorFunctions":
        await db.update(collaboratorFunctions).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(collaboratorFunctions.id, recordId));
        await writeAuditLog("collaboratorFunctions", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió función al estado anterior desde historial`, ctx);
        break;
      case "dofaMatrix": {
        // DOFA uses processId as recordId, and stores serialized JSON arrays
        const serialized = {
          debilidades: JSON.stringify(fieldsToRestore.debilidades ?? []),
          oportunidades: JSON.stringify(fieldsToRestore.oportunidades ?? []),
          fortalezas: JSON.stringify(fieldsToRestore.fortalezas ?? []),
          amenazas: JSON.stringify(fieldsToRestore.amenazas ?? []),
        };
        await db.update(dofaMatrix).set(serialized).where(eq(dofaMatrix.processId, recordId));
        await writeAuditLog("dofaMatrix", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió matriz DOFA al estado anterior desde historial`, ctx);
        break;
      }
      case "processInteractions":
        await db.update(processInteractions).set(sanitizeRestoreFields(fieldsToRestore, false)).where(eq(processInteractions.id, recordId));
        await writeAuditLog("processInteractions", recordId, "update", currentData, fieldsToRestore,
          `Admin revirtió interacción al estado anterior desde historial`, ctx);
        break;
      default:
        throw new Error(`Revert not supported for table: ${record.tableName}`);
    }
    await markAuditRestored(auditId);
    return { success: true, tableName: record.tableName, recordId, action: "update" };
  }

  // ── Handle CREATE: delete the created record ──────────────────────────────
  if (record.action === "create") {
    const recordId = record.recordId;
    switch (record.tableName) {
      case "kpis":
        await db.delete(kpis).where(eq(kpis.id, recordId));
        await writeAuditLog("kpis", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó KPI creado (restauración desde historial)`, ctx);
        break;
      case "projects":
        await db.delete(projects).where(eq(projects.id, recordId));
        await writeAuditLog("projects", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó proyecto creado (restauración desde historial)`, ctx);
        break;
      case "orgCollaborators":
        await db.delete(orgCollaborators).where(eq(orgCollaborators.id, recordId));
        await writeAuditLog("orgCollaborators", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó colaborador creado (restauración desde historial)`, ctx);
        break;
      case "orgHierarchies":
        await db.delete(orgHierarchies).where(eq(orgHierarchies.id, recordId));
        await writeAuditLog("orgHierarchies", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó cargo/nivel creado (restauración desde historial)`, ctx);
        break;
      case "processInteractions":
        await db.delete(processInteractions).where(eq(processInteractions.id, recordId));
        await writeAuditLog("processInteractions", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó interacción creada (restauración desde historial)`, ctx);
        break;
      case "interactionTasks":
        await db.delete(interactionTasks).where(eq(interactionTasks.id, recordId));
        await writeAuditLog("interactionTasks", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó tarea creada (restauración desde historial)`, ctx);
        break;
      case "interactionStrengths":
        await db.delete(interactionStrengths).where(eq(interactionStrengths.id, recordId));
        await writeAuditLog("interactionStrengths", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó fortaleza creada (restauración desde historial)`, ctx);
        break;
      case "collaboratorFunctions":
        await db.delete(collaboratorFunctions).where(eq(collaboratorFunctions.id, recordId));
        await writeAuditLog("collaboratorFunctions", recordId, "delete", JSON.parse(record.newData ?? "{}"), null,
          `Admin eliminó función creada (restauración desde historial)`, ctx);
        break;
      default:
        throw new Error(`Undo-create not supported for table: ${record.tableName}`);
    }
    await markAuditRestored(auditId);
    return { success: true, tableName: record.tableName, recordId, action: "create" };
  }

  // ── Handle DELETE: recreate the record ────────────────────────────────────
  if (record.action !== "delete") throw new Error("Unsupported action for restoration");
  if (!record.oldData) throw new Error("No snapshot data available for restoration");

  const oldData = JSON.parse(record.oldData);

  // Restore based on tableName
  switch (record.tableName) {
    case "kpis": {
      const rest = sanitizeRestoreFields(oldData);
      await db.insert(kpis).values(rest as any);
      await writeAuditLog("kpis", record.recordId, "create", null, rest,
        `Admin restauró KPI "${rest.name}" desde historial`, ctx);
      break;
    }
    case "projects": {
      const rest = sanitizeRestoreFields(oldData);
      await db.insert(projects).values({ ...rest, status: rest.status ?? "por_priorizar", hasNotification: false } as any);
      await writeAuditLog("projects", record.recordId, "create", null, rest,
        `Admin restauró proyecto "${rest.name}" desde historial`, ctx);
      break;
    }
    case "orgHierarchies": {
      // Restore hierarchy + collaborators + functions
      const { hierarchy, collaborators = [], functions = [] } = oldData;
      const hId = hierarchy.id;
      const hRest = sanitizeRestoreFields(hierarchy);
      await db.insert(orgHierarchies).values(hRest as any);
      // Get the new hierarchy id
      const newH = await db.select().from(orgHierarchies)
        .where(and(eq(orgHierarchies.processId, hRest.processId), eq(orgHierarchies.name, hRest.name)))
        .limit(1);
      const newHId = newH[0]?.id ?? hId;
      for (const collab of collaborators) {
        const cId = collab.id;
        const cRest = sanitizeRestoreFields(collab);
        await db.insert(orgCollaborators).values({ ...cRest, hierarchyId: newHId } as any);
        const newC = await db.select().from(orgCollaborators)
          .where(and(eq(orgCollaborators.hierarchyId, newHId), eq(orgCollaborators.name, cRest.name)))
          .limit(1);
        const newCId = newC[0]?.id ?? cId;
        for (const fn of functions.filter((f: any) => f.collaboratorId === cId)) {
          const fRest = sanitizeRestoreFields(fn);
          await db.insert(collaboratorFunctions).values({ ...fRest, collaboratorId: newCId } as any);
        }
      }
      await writeAuditLog("orgHierarchies", record.recordId, "create", null, hierarchy,
        `Admin restauró cargo/nivel "${hierarchy.name}" desde historial`, ctx);
      break;
    }
    case "orgCollaborators": {
      const { collaborator, functions: fns = [] } = oldData;
      const collabId = collaborator.id;
      const cRest = sanitizeRestoreFields(collaborator);
      await db.insert(orgCollaborators).values(cRest as any);
      const newC = await db.select().from(orgCollaborators)
        .where(and(eq(orgCollaborators.hierarchyId, cRest.hierarchyId), eq(orgCollaborators.name, cRest.name)))
        .limit(1);
      const newCId = newC[0]?.id ?? collabId;
      for (const fn of fns) {
        const fRest = sanitizeRestoreFields(fn);
        await db.insert(collaboratorFunctions).values({ ...fRest, collaboratorId: newCId } as any);
      }
      await writeAuditLog("orgCollaborators", record.recordId, "create", null, collaborator,
        `Admin restauró colaborador "${collaborator.name}" desde historial`, ctx);
      break;
    }
    case "processInteractions": {
      const { interaction, tasks = [], strengths = [] } = oldData;
      const interactionId = interaction.id;
      const iRest = sanitizeRestoreFields(interaction);
      await db.insert(processInteractions).values(iRest as any);
      const newI = await db.select().from(processInteractions)
        .where(and(eq(processInteractions.processId, iRest.processId), eq(processInteractions.relatedProcessName, iRest.relatedProcessName)))
        .limit(1);
      const newIId = newI[0]?.id ?? interactionId;
      for (const task of tasks) {
        const tRest = sanitizeRestoreFields(task);
        await db.insert(interactionTasks).values({ ...tRest, interactionId: newIId } as any);
      }
      for (const str of strengths) {
        const sRest = sanitizeRestoreFields(str);
        await db.insert(interactionStrengths).values({ ...sRest, interactionId: newIId } as any);
      }
      await writeAuditLog("processInteractions", record.recordId, "create", null, interaction,
        `Admin restauró interacción con "${interaction.relatedProcessName}" desde historial`, ctx);
      break;
    }
    default:
      throw new Error(`Restoration not supported for table: ${record.tableName}`);
  }

  // Mark the audit entry as restored
  await markAuditRestored(auditId);
  return { success: true, tableName: record.tableName, recordId: record.recordId };
}

// ─── Audit Log Export ─────────────────────────────────────────────────────────

export async function getAuditLogsExportData() {
  const db = await getDb();
  if (!db) return [];

  const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(2000);
  return logs.map((log) => ({
    id: log.id,
    fecha: log.createdAt ? new Date(log.createdAt).toLocaleString("es-CO") : "",
    modulo: log.tableName,
    accion: log.action,
    descripcion: log.description ?? "",
    usuario: log.userName ?? "",
    email: log.userEmail ?? "",
    area: log.processName ?? "",
    restaurado: log.isRestored ? "Sí" : "No",
  }));
}

// ─── User Individual Progress ─────────────────────────────────────────────────
export async function getUserProgress(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const process = await db.select().from(processes).where(eq(processes.userId, userId)).limit(1);
  if (process.length === 0) return null;

  const proc = process[0];
  const processId = proc.id;

  const hierarchies = await db.select().from(orgHierarchies).where(eq(orgHierarchies.processId, processId)).limit(1);
  const kpiList = await db.select().from(kpis).where(eq(kpis.processId, processId)).limit(1);
  const dofaList = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, processId)).limit(1);
  const proveedores = await db.select().from(processInteractions)
    .where(and(eq(processInteractions.processId, processId), eq(processInteractions.type, "proveedor"))).limit(1);
  const clientes = await db.select().from(processInteractions)
    .where(and(eq(processInteractions.processId, processId), eq(processInteractions.type, "cliente"))).limit(1);
  const projectList = await db.select().from(projects).where(eq(projects.processId, processId)).limit(1);

  const organigramaOk = hierarchies.length > 0;
  const kpisOk = kpiList.length > 0;
  const dofaOk = dofaList.length > 0;
  const proveedoresOk = proveedores.length > 0;
  const clientesOk = clientes.length > 0;
  const proyectosOk = projectList.length > 0;

  const completedCount = [organigramaOk, kpisOk, dofaOk, proveedoresOk, clientesOk, proyectosOk].filter(Boolean).length;

  return {
    processId,
    processName: proc.processName ?? "",
    areaName: proc.areaName ?? "",
    organigrama: organigramaOk,
    kpis: kpisOk,
    dofa: dofaOk,
    proveedores: proveedoresOk,
    clientes: clientesOk,
    proyectos: proyectosOk,
    completedCount,
    totalCount: 6,
  };
}

// ─── Admin: All KPIs across all processes ────────────────────────────────────

export async function getAllKPIs() {
  const db = await getDb();
  if (!db) return [];

  const allProcesses = await db.select().from(processes);
  const result = [];

  for (const process of allProcesses) {
    const user = await db.select().from(users).where(eq(users.id, process.userId)).limit(1);
    const authUser = user.length > 0 && user[0].email
      ? await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, user[0].email)).limit(1)
      : [];
    const kpiList = await db.select().from(kpis).where(eq(kpis.processId, process.id));

    if (kpiList.length === 0) continue;

    result.push({
      processId: process.id,
      processName: process.processName ?? "",
      areaName: process.areaName ?? authUser[0]?.areaName ?? "",
      leaderName: authUser[0]?.name ?? user[0]?.name ?? "",
      kpis: kpiList,
    });
  }

  return result;
}

// ─── Admin: All DOFA across all processes ────────────────────────────────────

export async function getAllDofa() {
  const db = await getDb();
  if (!db) return [];

  const allProcesses = await db.select().from(processes);
  const result = [];

  for (const process of allProcesses) {
    const user = await db.select().from(users).where(eq(users.id, process.userId)).limit(1);
    const authUser = user.length > 0 && user[0].email
      ? await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, user[0].email)).limit(1)
      : [];
    const dofaRow = await db.select().from(dofaMatrix).where(eq(dofaMatrix.processId, process.id)).limit(1);

    if (dofaRow.length === 0) continue;

    result.push({
      processId: process.id,
      processName: process.processName ?? "",
      areaName: process.areaName ?? authUser[0]?.areaName ?? "",
      leaderName: authUser[0]?.name ?? user[0]?.name ?? "",
      dofa: {
        ...dofaRow[0],
        debilidades: JSON.parse(dofaRow[0].debilidades || "[]") as string[],
        oportunidades: JSON.parse(dofaRow[0].oportunidades || "[]") as string[],
        fortalezas: JSON.parse(dofaRow[0].fortalezas || "[]") as string[],
        amenazas: JSON.parse(dofaRow[0].amenazas || "[]") as string[],
      },
    });
  }

  return result;
}

// ─── Admin: All Interactions across all processes ─────────────────────────────

export async function getAllInteractions() {
  const db = await getDb();
  if (!db) return [];

  const allProcesses = await db.select().from(processes);
  const result = [];

  for (const process of allProcesses) {
    const user = await db.select().from(users).where(eq(users.id, process.userId)).limit(1);
    const authUser = user.length > 0 && user[0].email
      ? await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, user[0].email)).limit(1)
      : [];
    const interactions = await db.select().from(processInteractions).where(eq(processInteractions.processId, process.id));

    if (interactions.length === 0) continue;

    // Load tasks and strengths for each interaction
    const interactionsWithDetails = await Promise.all(interactions.map(async (interaction) => {
      const tasks = await db.select().from(interactionTasks).where(eq(interactionTasks.interactionId, interaction.id));
      const strengths = await db.select().from(interactionStrengths).where(eq(interactionStrengths.interactionId, interaction.id));
      return { ...interaction, tasks, strengths };
    }));

    result.push({
      processId: process.id,
      processName: process.processName ?? "",
      areaName: process.areaName ?? authUser[0]?.areaName ?? "",
      leaderName: authUser[0]?.name ?? user[0]?.name ?? "",
      interactions: interactionsWithDetails,
    });
  }

  return result;
}

// ─── Admin: List all process names for filter dropdowns ──────────────────────

export async function getAllProcessNames() {
  const db = await getDb();
  if (!db) return [];

  const allProcesses = await db.select({
    id: processes.id,
    processName: processes.processName,
    areaName: processes.areaName,
  }).from(processes);

  return allProcesses
    .filter(p => p.processName && p.processName.trim() !== "")
    .map(p => ({ id: p.id, processName: p.processName ?? "", areaName: p.areaName ?? "" }));
}

// ─── Process Notifications ──────────────────────────────────────────────────

export async function createProcessNotification(
  processId: number,
  module: "kpis" | "dofa" | "interacciones" | "proyectos" | "organigrama",
  message: string,
  adminName?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(processNotifications).values({ processId, module, message, adminName });
}

export async function getProcessNotifications(
  processId: number,
  module?: "kpis" | "dofa" | "interacciones" | "proyectos" | "organigrama",
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(processNotifications.processId, processId),
    eq(processNotifications.isRead, false),
  ];
  if (module) conditions.push(eq(processNotifications.module, module));
  return db.select().from(processNotifications)
    .where(and(...conditions))
    .orderBy(desc(processNotifications.createdAt));
}

export async function dismissProcessNotification(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(processNotifications).set({ isRead: true }).where(eq(processNotifications.id, id));
}

export async function dismissAllProcessNotifications(processId: number, module: "kpis" | "dofa" | "interacciones" | "proyectos" | "organigrama") {
  const db = await getDb();
  if (!db) return;
  await db.update(processNotifications).set({ isRead: true })
    .where(and(
      eq(processNotifications.processId, processId),
      eq(processNotifications.module, module),
      eq(processNotifications.isRead, false),
    ));
}
