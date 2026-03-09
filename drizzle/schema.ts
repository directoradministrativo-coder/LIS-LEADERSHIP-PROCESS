import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Procesos - cada usuario/área tiene un proceso asociado
 */
export const processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  processName: varchar("processName", { length: 255 }).notNull().default(""),
  areaName: varchar("areaName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;

/**
 * Jerarquías del organigrama
 */
export const orgHierarchies = mysqlTable("orgHierarchies", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // Director, Gerente, Jefe, etc.
  level: int("level").notNull(), // 0=Director, 1=Gerente, etc.
  parentId: int("parentId"), // Para jerarquías personalizadas
  isCustom: boolean("isCustom").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrgHierarchy = typeof orgHierarchies.$inferSelect;
export type InsertOrgHierarchy = typeof orgHierarchies.$inferInsert;

/**
 * Colaboradores del organigrama
 */
export const orgCollaborators = mysqlTable("orgCollaborators", {
  id: int("id").autoincrement().primaryKey(),
  hierarchyId: int("hierarchyId").notNull(),
  processId: int("processId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }),
  functionsVisible: boolean("functionsVisible").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrgCollaborator = typeof orgCollaborators.$inferSelect;
export type InsertOrgCollaborator = typeof orgCollaborators.$inferInsert;

/**
 * Funciones de los colaboradores
 */
export const collaboratorFunctions = mysqlTable("collaboratorFunctions", {
  id: int("id").autoincrement().primaryKey(),
  collaboratorId: int("collaboratorId").notNull(),
  description: text("description").notNull(),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CollaboratorFunction = typeof collaboratorFunctions.$inferSelect;
export type InsertCollaboratorFunction = typeof collaboratorFunctions.$inferInsert;

/**
 * KPIs del proceso
 */
export const kpis = mysqlTable("kpis", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  objective: text("objective").notNull(),
  frequency: mysqlEnum("frequency", ["dia", "semana", "mes"]).notNull(),
  formula: text("formula").notNull(),
  responsible: varchar("responsible", { length: 255 }).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPI = typeof kpis.$inferSelect;
export type InsertKPI = typeof kpis.$inferInsert;

/**
 * Matriz DOFA del proceso
 */
export const dofaMatrix = mysqlTable("dofaMatrix", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull().unique(),
  debilidades: text("debilidades").notNull(),
  oportunidades: text("oportunidades").notNull(),
  fortalezas: text("fortalezas").notNull(),
  amenazas: text("amenazas").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DofaMatrix = typeof dofaMatrix.$inferSelect;
export type InsertDofaMatrix = typeof dofaMatrix.$inferInsert;

/**
 * Proveedores/Clientes del proceso (tabla unificada con tipo)
 */
export const processInteractions = mysqlTable("processInteractions", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  type: mysqlEnum("type", ["proveedor", "cliente"]).notNull(),
  relatedProcessName: varchar("relatedProcessName", { length: 255 }).notNull(),
  isCustomProcess: boolean("isCustomProcess").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessInteraction = typeof processInteractions.$inferSelect;
export type InsertProcessInteraction = typeof processInteractions.$inferInsert;

/**
 * Tareas/actividades de cada interacción proveedor/cliente
 */
export const interactionTasks = mysqlTable("interactionTasks", {
  id: int("id").autoincrement().primaryKey(),
  interactionId: int("interactionId").notNull(),
  taskActivity: text("taskActivity").notNull(),
  documentRoute: text("documentRoute").notNull(),
  responsibleRole: varchar("responsibleRole", { length: 255 }).notNull(),
  ansUndefined: boolean("ansUndefined").default(false).notNull(),
  ansNumber: int("ansNumber"), // 1-9
  ansType: mysqlEnum("ansType", ["dias_calendario", "dias_habiles", "semanas", "meses"]),
  ansCompliance: int("ansCompliance"), // 1-5, null si ansUndefined=true
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InteractionTask = typeof interactionTasks.$inferSelect;
export type InsertInteractionTask = typeof interactionTasks.$inferInsert;

/**
 * Fortalezas y oportunidades entre procesos
 */
export const interactionStrengths = mysqlTable("interactionStrengths", {
  id: int("id").autoincrement().primaryKey(),
  interactionId: int("interactionId").notNull(),
  type: mysqlEnum("type", ["fortaleza", "oportunidad"]).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InteractionStrength = typeof interactionStrengths.$inferSelect;
export type InsertInteractionStrength = typeof interactionStrengths.$inferInsert;

/**
 * Lista cerrada de usuarios autorizados para ingresar a la app
 */
export const authorizedUsers = mysqlTable("authorizedUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  areaName: varchar("areaName", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  isEnrolled: boolean("isEnrolled").default(false).notNull(),
  enrolledAt: timestamp("enrolledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type InsertAuthorizedUser = typeof authorizedUsers.$inferInsert;

/**
 * Observaciones por módulo (KPIs, Interacciones)
 */
export const moduleObservations = mysqlTable("moduleObservations", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  module: mysqlEnum("module", ["kpi", "proveedor", "cliente", "dofa", "organigrama"]).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModuleObservation = typeof moduleObservations.$inferSelect;
export type InsertModuleObservation = typeof moduleObservations.$inferInsert;

/**
 * Proyectos del proceso
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  impact: int("impact").notNull(), // 1-5
  difficulty: int("difficulty").notNull(), // 1-5
  subtotal: int("subtotal").notNull(), // impact * difficulty
  status: mysqlEnum("status", ["por_priorizar", "en_ejecucion", "finalizado", "suspendido", "cancelado"]).default("por_priorizar").notNull(),
  statusObservations: text("statusObservations"),
  hasNotification: boolean("hasNotification").default(false).notNull(),
  notificationMessage: text("notificationMessage"),
  adminModifiedAt: timestamp("adminModifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Configuración global de la app (fecha límite, etc.)
 */
export const appConfig = mysqlTable("appConfig", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = typeof appConfig.$inferInsert;

// ─── Audit Log ────────────────────────────────────────────────────────────────
// Stores a snapshot of every create/update/delete operation for recovery.
// Only admins can read and restore from this table.

export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  // Which table and record was affected
  tableName: varchar("tableName", { length: 64 }).notNull(),
  recordId: int("recordId").notNull(),
  // Type of operation
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  // Full JSON snapshot of the record before the change (null for create)
  oldData: text("oldData"),
  // Full JSON snapshot of the record after the change (null for delete)
  newData: text("newData"),
  // Who performed the action
  userId: int("userId"),
  userName: varchar("userName", { length: 200 }),
  userEmail: varchar("userEmail", { length: 200 }),
  // Process context for easy filtering
  processId: int("processId"),
  processName: varchar("processName", { length: 200 }),
  // Human-readable description of what changed
  description: varchar("description", { length: 500 }),
  // Whether this record has been restored
  isRestored: boolean("isRestored").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ─── Process Notifications ──────────────────────────────────────────────────
// Generic notification system for admin actions on any module.
// Users see a banner when admin modifies their data.

export const processNotifications = mysqlTable("processNotifications", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  module: mysqlEnum("module", ["kpis", "dofa", "interacciones", "proyectos", "organigrama"]).notNull(),
  message: text("message").notNull(),
  adminName: varchar("adminName", { length: 255 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessNotification = typeof processNotifications.$inferSelect;
export type InsertProcessNotification = typeof processNotifications.$inferInsert;
