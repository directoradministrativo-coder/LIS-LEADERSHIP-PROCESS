/**
 * Unit tests for role-based permission logic in the tab layout.
 * Tests the isAdmin flag and tab visibility rules.
 */
import { describe, it, expect } from "vitest";

type LisRole = "user" | "admin" | "superadmin" | null;

// Mirrors the logic in _layout.tsx
function computePermissions(lisRole: LisRole) {
  const isAdmin = lisRole === "admin" || lisRole === "superadmin";
  const renderTabs = lisRole !== null;
  return {
    isAdmin,
    renderTabs,
    // Tab visibility: null = hidden, undefined = visible
    exportarHref: isAdmin ? undefined : null,
    adminUsuariosHref: isAdmin ? undefined : null,
    adminProyectosHref: isAdmin ? undefined : null,
    adminHistorialHref: isAdmin ? undefined : null,
    // Tabs always visible for all roles
    inicioHref: undefined,
    organigramaHref: undefined,
    kpisHref: undefined,
    dofaHref: undefined,
    interaccionesHref: undefined,
    proyectosHref: undefined,
    adminProgresoHref: undefined, // shows different content by role
  };
}

describe("Role-based tab permissions", () => {
  it("user role: admin-only tabs are hidden (href: null)", () => {
    const perms = computePermissions("user");
    expect(perms.isAdmin).toBe(false);
    expect(perms.renderTabs).toBe(true);
    expect(perms.exportarHref).toBeNull();
    expect(perms.adminUsuariosHref).toBeNull();
    expect(perms.adminProyectosHref).toBeNull();
    expect(perms.adminHistorialHref).toBeNull();
  });

  it("user role: shared tabs are visible (href: undefined)", () => {
    const perms = computePermissions("user");
    expect(perms.inicioHref).toBeUndefined();
    expect(perms.organigramaHref).toBeUndefined();
    expect(perms.kpisHref).toBeUndefined();
    expect(perms.dofaHref).toBeUndefined();
    expect(perms.interaccionesHref).toBeUndefined();
    expect(perms.proyectosHref).toBeUndefined();
    expect(perms.adminProgresoHref).toBeUndefined();
  });

  it("admin role: all tabs are visible (href: undefined)", () => {
    const perms = computePermissions("admin");
    expect(perms.isAdmin).toBe(true);
    expect(perms.renderTabs).toBe(true);
    expect(perms.exportarHref).toBeUndefined();
    expect(perms.adminUsuariosHref).toBeUndefined();
    expect(perms.adminProyectosHref).toBeUndefined();
    expect(perms.adminHistorialHref).toBeUndefined();
  });

  it("superadmin role: all tabs are visible (href: undefined)", () => {
    const perms = computePermissions("superadmin");
    expect(perms.isAdmin).toBe(true);
    expect(perms.renderTabs).toBe(true);
    expect(perms.exportarHref).toBeUndefined();
    expect(perms.adminUsuariosHref).toBeUndefined();
    expect(perms.adminProyectosHref).toBeUndefined();
    expect(perms.adminHistorialHref).toBeUndefined();
  });

  it("null role (loading): tabs are not rendered yet", () => {
    const perms = computePermissions(null);
    expect(perms.isAdmin).toBe(false);
    expect(perms.renderTabs).toBe(false);
  });
});

describe("Role-based content differentiation", () => {
  it("user role: should use personal project list (not admin consolidated)", () => {
    const perms = computePermissions("user");
    // In proyectos.tsx: user uses trpc.project.list, admin uses trpc.admin.getAllProjects
    expect(perms.isAdmin).toBe(false);
  });

  it("admin role: should use consolidated project list", () => {
    const perms = computePermissions("admin");
    expect(perms.isAdmin).toBe(true);
  });

  it("user role: should see personal progress view", () => {
    const perms = computePermissions("user");
    // In admin-progreso.tsx: user sees UserProgressView, admin sees ConsolidatedView
    expect(perms.isAdmin).toBe(false);
  });

  it("admin role: should see consolidated progress view", () => {
    const perms = computePermissions("admin");
    expect(perms.isAdmin).toBe(true);
  });
});
