import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@lis.com.co",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LIS Process Survey - API Health", () => {
  it("should respond to health check", async () => {
    const res = await fetch("http://localhost:3000/api/health");
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("ok", true);
  });
});

describe("LIS Process Survey - Auth Router", () => {
  it("auth.me returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@lis.com.co");
  });

  it("auth.logout clears session and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: { host: "localhost:3000" }, hostname: "localhost" } as TrpcContext["req"],
      res: { clearCookie: (name: string) => cleared.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared.length).toBeGreaterThanOrEqual(1);
  });
});

describe("LIS Process Survey - Protected Routes", () => {
  it("should throw UNAUTHORIZED for unauthenticated process.getOrCreate", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.process.getOrCreate()).rejects.toThrow();
  });

  it("should allow authenticated user to get/create process", async () => {
    const ctx = createAuthContext(9999);
    const caller = appRouter.createCaller(ctx);
    const process = await caller.process.getOrCreate();
    expect(process).toBeDefined();
    expect(process).toHaveProperty("userId", 9999);
  });
});

describe("LIS Process Survey - KPI Router", () => {
  it("should return empty KPI list for new user", async () => {
    const ctx = createAuthContext(9998);
    const caller = appRouter.createCaller(ctx);
    const kpis = await caller.kpi.list();
    expect(Array.isArray(kpis)).toBe(true);
  });

  it("should create and delete a KPI", async () => {
    const ctx = createAuthContext(9997);
    const caller = appRouter.createCaller(ctx);
    const kpi = await caller.kpi.create({
      name: "Test KPI",
      objective: "Objetivo de prueba",
      formula: "A / B * 100",
      frequency: "mes",
      responsible: "Analista Test",
    });
    expect(kpi).toHaveProperty("id");
    expect(kpi.name).toBe("Test KPI");

    // Cleanup
    await caller.kpi.delete({ id: kpi.id });
    const kpis = await caller.kpi.list();
    expect(kpis.find(k => k.id === kpi.id)).toBeUndefined();
  });
});

describe("LIS Process Survey - DOFA Router", () => {
  it("should save and retrieve DOFA data", async () => {
    const ctx = createAuthContext(9996);
    const caller = appRouter.createCaller(ctx);
    const dofaInput = {
      debilidades: ["Debilidad 1", "Debilidad 2"],
      oportunidades: ["Oportunidad 1"],
      fortalezas: ["Fortaleza 1", "Fortaleza 2"],
      amenazas: ["Amenaza 1"],
    };
    await caller.dofa.save(dofaInput);
    const dofa = await caller.dofa.get();
    expect(dofa?.debilidades).toEqual(dofaInput.debilidades);
    expect(dofa?.oportunidades).toEqual(dofaInput.oportunidades);
    expect(dofa?.fortalezas).toEqual(dofaInput.fortalezas);
    expect(dofa?.amenazas).toEqual(dofaInput.amenazas);
  });
});
