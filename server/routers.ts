import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Processes
  process: router({
    getOrCreate: protectedProcedure.query(({ ctx }) => {
      return db.getOrCreateProcess(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({ processName: z.string().min(1).max(255), areaName: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        return db.updateProcess(ctx.user.id, input);
      }),
  }),

  // Organigrama - Hierarchies
  hierarchy: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getHierarchies(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100), level: z.number(), parentId: z.number().optional(), isCustom: z.boolean().optional() }))
      .mutation(({ ctx, input }) => {
        return db.createHierarchy(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100), level: z.number().optional() }))
      .mutation(({ ctx, input }) => {
        return db.updateHierarchy(input.id, { name: input.name, level: input.level }, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteHierarchy(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Organigrama - Collaborators
  collaborator: router({
    listAll: protectedProcedure.query(({ ctx }) => {
      return db.getAllCollaborators(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ hierarchyId: z.number(), name: z.string().min(1).max(255), position: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        return db.createCollaborator(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), position: z.string().optional(), functionsVisible: z.boolean().optional() }))
      .mutation(({ ctx, input }) => {
        return db.updateCollaborator(input.id, input, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteCollaborator(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Collaborator Functions
  collaboratorFunction: router({
    list: protectedProcedure
      .input(z.object({ collaboratorId: z.number() }))
      .query(({ input }) => {
        return db.getCollaboratorFunctions(input.collaboratorId);
      }),
    create: protectedProcedure
      .input(z.object({ collaboratorId: z.number(), description: z.string().min(1), order: z.number().optional() }))
      .mutation(({ input }) => {
        return db.createCollaboratorFunction(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), description: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        return db.updateCollaboratorFunction(input.id, input.description, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.deleteCollaboratorFunction(input.id);
      }),
  }),
  // KPIs
  kpi: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getKPIs(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        objective: z.string().min(1),
        frequency: z.enum(["dia", "semana", "mes"]),
        formula: z.string().min(1),
        responsible: z.string().min(1).max(255),
      }))
      .mutation(({ ctx, input }) => {
        return db.createKPI(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        objective: z.string().min(1).optional(),
        frequency: z.enum(["dia", "semana", "mes"]).optional(),
        formula: z.string().min(1).optional(),
        responsible: z.string().min(1).max(255).optional(),
      }))
      .mutation(({ input }) => {
        return db.updateKPI(input.id, input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteKPI(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // DOFA
  dofa: router({
    get: protectedProcedure.query(({ ctx }) => {
      return db.getDofa(ctx.user.id);
    }),
    save: protectedProcedure
      .input(z.object({
        debilidades: z.array(z.string()),
        oportunidades: z.array(z.string()),
        fortalezas: z.array(z.string()),
        amenazas: z.array(z.string()),
      }))
      .mutation(({ ctx, input }) => {
        return db.saveDofa(ctx.user.id, input, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Process Interactions (Proveedores & Clientes)
  interaction: router({
    list: protectedProcedure
      .input(z.object({ type: z.enum(["proveedor", "cliente"]) }))
      .query(({ ctx, input }) => {
        return db.getInteractions(ctx.user.id, input.type);
      }),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["proveedor", "cliente"]),
        relatedProcessName: z.string().min(1).max(255),
        isCustomProcess: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createInteraction(ctx.user.id, input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteInteraction(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        relatedProcessName: z.string().min(1).max(255),
        isCustomProcess: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.updateInteraction(input.id, { relatedProcessName: input.relatedProcessName, isCustomProcess: input.isCustomProcess }, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Interaction Tasks
  interactionTask: router({
    list: protectedProcedure
      .input(z.object({ interactionId: z.number() }))
      .query(({ input }) => {
        return db.getInteractionTasks(input.interactionId);
      }),
    create: protectedProcedure
      .input(z.object({
        interactionId: z.number(),
        taskActivity: z.string().min(1),
        documentRoute: z.string().min(1),
        responsibleRole: z.string().min(1).max(255),
        ansUndefined: z.boolean(),
        ansNumber: z.number().min(1).max(9).optional(),
        ansType: z.enum(["dias_calendario", "dias_habiles", "semanas", "meses"]).optional(),
        ansCompliance: z.number().min(1).max(5).optional(),
      }))
      .mutation(({ input }) => {
        return db.createInteractionTask(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        taskActivity: z.string().min(1).optional(),
        documentRoute: z.string().min(1).optional(),
        responsibleRole: z.string().min(1).max(255).optional(),
        ansUndefined: z.boolean().optional(),
        ansNumber: z.number().min(1).max(9).optional().nullable(),
        ansType: z.enum(["dias_calendario", "dias_habiles", "semanas", "meses"]).optional().nullable(),
        ansCompliance: z.number().min(1).max(5).optional().nullable(),
      }))
      .mutation(({ ctx, input }) => {
        return db.updateInteractionTask(input.id, input, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.deleteInteractionTask(input.id);
      }),
  }),

  // Interaction Strengths (Fortalezas & Oportunidades)
  interactionStrength: router({
    list: protectedProcedure
      .input(z.object({ interactionId: z.number() }))
      .query(({ input }) => {
        return db.getInteractionStrengths(input.interactionId);
      }),
    create: protectedProcedure
      .input(z.object({
        interactionId: z.number(),
        type: z.enum(["fortaleza", "oportunidad"]),
        description: z.string().min(1),
      }))
      .mutation(({ input }) => {
        return db.createInteractionStrength(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), description: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        return db.updateInteractionStrength(input.id, input.description, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.deleteInteractionStrength(input.id);
      }),
  }),

  // Admin: manage authorized users
  admin: router({
    // Get all authorized users (admin only)
    listAuthorizedUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAuthorizedUsers();
    }),
    createAuthorizedUser: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1).max(255),
        areaName: z.string().optional(),
      role: z.enum(["user", "admin", "superadmin"]).optional(),
      })).
      mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.createAuthorizedUser(input);
      }),
    updateAuthorizedUser: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        areaName: z.string().optional(),
      role: z.enum(["user", "admin", "superadmin"]).optional(),
      })).
      mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.updateAuthorizedUser(input.id, input);
      }),
    deleteAuthorizedUser: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.deleteAuthorizedUser(input.id);
      }),
    // Get all processes data for admin view
    getAllProcesses: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllProcessesData();
    }),
    // Get all projects across all areas (admin only)
    getAllProjects: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllProjects();
    }),
    // Update a project (admin only)
    updateProject: protectedProcedure
      .input(z.object({
        id: z.number(),
        impact: z.number().min(1).max(5).optional(),
        difficulty: z.number().min(1).max(5).optional(),
        status: z.enum(["por_priorizar", "en_ejecucion", "finalizado", "suspendido", "cancelado"]).optional(),
        statusObservations: z.string().nullable().optional(),
        notificationMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        const { id, ...data } = input;
        return db.adminUpdateProject(id, data, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    // Get consolidated progress for all users
    getConsolidatedProgress: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getConsolidatedProgress();
    }),
    // Get all KPIs across all processes (admin only)
    getAllKPIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllKPIs();
    }),
    // Get all DOFA across all processes (admin only)
    getAllDofa: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllDofa();
    }),
    // Get all Interactions across all processes (admin only)
    getAllInteractions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllInteractions();
    }),
    // Get all process names for filter dropdowns (admin only)
    getAllProcessNames: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllProcessNames();
    }),
    // Admin: save DOFA for any process by processId
    saveDofaByProcessId: protectedProcedure
      .input(z.object({
        processId: z.number(),
        debilidades: z.array(z.string()),
        oportunidades: z.array(z.string()),
        fortalezas: z.array(z.string()),
        amenazas: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        const { processId, ...data } = input;
        return db.saveDofaByProcessId(processId, data, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    // Admin: delete interaction by id
    deleteInteraction: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.deleteInteraction(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Process Notifications
  notification: router({
    // Get unread notifications for current user's process (optionally filtered by module)
    list: protectedProcedure
      .input(z.object({ module: z.enum(["kpis", "dofa", "interacciones", "proyectos", "organigrama"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const process = await db.getOrCreateProcess(ctx.user.id);
        if (!process) return [];
        return db.getProcessNotifications(process.id, input?.module);
      }),
    // Dismiss a single notification
    dismiss: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.dismissProcessNotification(input.id);
      }),
    // Dismiss all notifications for a module
    dismissAll: protectedProcedure
      .input(z.object({ module: z.enum(["kpis", "dofa", "interacciones", "proyectos", "organigrama"]) }))
      .mutation(async ({ ctx, input }) => {
        const process = await db.getOrCreateProcess(ctx.user.id);
        if (!process) return;
        return db.dismissAllProcessNotifications(process.id, input.module);
      }),
    // Create a notification (admin only)
    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        module: z.enum(["kpis", "dofa", "interacciones", "proyectos", "organigrama"]),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.createProcessNotification(input.processId, input.module, input.message, ctx.user.name ?? undefined);
      }),
  }),

  // Check if user is authorized (public - called after OAuth login)
  auth2: router({
    checkAuthorization: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.email) return { authorized: false, role: null };
      const authUser = await db.getAuthorizedUserByEmail(ctx.user.email);
      if (!authUser) return { authorized: false, role: null };
      // Mark as enrolled if first time
      if (!authUser.isEnrolled) {
        await db.markUserAsEnrolled(ctx.user.email);
        await db.updateAuthorizedUser(authUser.id, { isEnrolled: true, enrolledAt: new Date() });
      }
      // Always sync role from authorizedUsers to users table so ctx.user.role stays current
      if (ctx.user.role !== authUser.role) {
        await db.syncUserRole(ctx.user.id, authUser.role);
      }
      return { authorized: true, role: authUser.role, areaName: authUser.areaName };
    }),
  }),

  // Module observations
  observation: router({
    get: protectedProcedure
      .input(z.object({ module: z.enum(["kpi", "proveedor", "cliente", "dofa", "organigrama"]) }))
      .query(({ ctx, input }) => {
        return db.getModuleObservation(ctx.user.id, input.module);
      }),
    save: protectedProcedure
      .input(z.object({
        module: z.enum(["kpi", "proveedor", "cliente", "dofa", "organigrama"]),
        observations: z.string(),
      }))
      .mutation(({ ctx, input }) => {
        return db.saveModuleObservation(ctx.user.id, input.module, input.observations);
      }),
  }),

  // Module progress tracking
  progress: router({
    // Returns completion status for each of the 5 modules
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getModuleProgress(ctx.user.id);
    }),
    // Returns full progress summary for the current user (modules completed, percentages)
    myProgress: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProgress(ctx.user.id);
    }),
  }),

  // Projects
  project: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getProjects(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().min(1),
        impact: z.number().min(1).max(5),
        difficulty: z.number().min(1).max(5),
      }))      .mutation(async ({ ctx, input }) => {
        return db.createProject(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().min(1).optional(),
        impact: z.number().min(1).max(5).optional(),
        difficulty: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: Parameters<typeof db.updateProject>[1] = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.impact !== undefined) updateData.impact = input.impact;
        if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;

        // Only update if there are fields to set
        if (Object.keys(updateData).length > 0) {
          await db.updateProject(input.id, updateData, {
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            userEmail: ctx.user.email ?? undefined,
          });
        }

        // Recalculate subtotal if impact or difficulty changed
        if (input.impact !== undefined || input.difficulty !== undefined) {
          const current = await db.getProjectById(input.id);
          if (current) {
            await db.updateProject(input.id, { subtotal: current.impact * current.difficulty });
          }
        }

        return db.getProjectById(input.id);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteProject(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
    dismissNotification: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.dismissProjectNotification(input.id);
      }),
  }),

  // App Config (deadline, etc.)
  config: router({
    getDeadline: protectedProcedure.query(async () => {
      const value = await db.getConfig("deadline");
      return { deadline: value };
    }),
    setDeadline: protectedProcedure
      .input(z.object({ deadline: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        await db.setConfig("deadline", input.deadline);
        return { success: true };
      }),
  }),

  // Admin: Audit Log
  audit: router({
    list: protectedProcedure
      .input(z.object({
        tableName: z.string().optional(),
        action: z.enum(["create", "update", "delete"]).optional(),
        processId: z.number().optional(),
        processName: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.getAuditLogs(input);
      }),
    // Get list of all process names for filter dropdown
    listProcessNames: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAuditProcessNames();
    }),
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
        return db.restoreAuditRecord(input.id, { userId: ctx.user.id, userName: ctx.user.name ?? undefined, userEmail: ctx.user.email ?? undefined });
      }),
  }),

  // Export data for Excel
  export: router({
    orgChart: protectedProcedure.query(({ ctx }) => {
      return db.getOrgChartExportData(ctx.user.id);
    }),
    kpis: protectedProcedure.query(({ ctx }) => {
      return db.getKPIsExportData(ctx.user.id);
    }),
    dofa: protectedProcedure.query(({ ctx }) => {
      return db.getDofaExportData(ctx.user.id);
    }),
    interactions: protectedProcedure.query(({ ctx }) => {
      return db.getInteractionsExportData(ctx.user.id);
    }),
    projects: protectedProcedure.query(({ ctx }) => {
      return db.getProjectsExportData(ctx.user.id);
    }),
    // Admin/SuperAdmin: export all processes consolidated
    allProcesses: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAllProcessesData();
    }),
    // Admin: export audit log
    auditLog: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new Error("UNAUTHORIZED");
      return db.getAuditLogsExportData();
    }),
  }),
});

export type AppRouter = typeof appRouter;
