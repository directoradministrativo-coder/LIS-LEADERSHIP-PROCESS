import * as XLSX from "xlsx-js-style";
import { Platform } from "react-native";

// ============================================================
// Types
// ============================================================

type OrgChartData = {
  process: any;
  hierarchies: any[];
  collaborators: any[];
  functions: any[];
};

type KPIsData = {
  process: any;
  kpis: any[];
};

type DofaData = {
  process: any;
  dofa: any;
};

type InteractionsData = {
  process: any;
  interactions: any[];
};

type ProjectsData = {
  process: any;
  projects: any[];
};

type AuditLogEntry = {
  id: number;
  fecha: string;
  modulo: string;
  accion: string;
  descripcion: string;
  usuario: string;
  email: string;
  area: string;
  restaurado: string;
};

// ============================================================
// Style Definitions — Corporate LIS Theme
// ============================================================

const COLORS = {
  red: "CC2229",
  darkBlue: "1B4F9B",
  gold: "F5A623",
  green: "5CB85C",
  purple: "6366F1",
  gray: "6C757D",
  lightGray: "F3F4F6",
  white: "FFFFFF",
  black: "1A1A2E",
  headerBg: "CC2229",
  subHeaderBg: "1B4F9B",
  altRowBg: "F9FAFB",
  borderColor: "D1D5DB",
};

const S_TITLE: XLSX.CellStyle = {
  font: { bold: true, color: { rgb: COLORS.white }, sz: 14, name: "Calibri" },
  fill: { fgColor: { rgb: COLORS.red } },
  alignment: { horizontal: "center", vertical: "center" },
};

const S_HEADER: XLSX.CellStyle = {
  font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" },
  fill: { fgColor: { rgb: COLORS.subHeaderBg } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    bottom: { style: "thin", color: { rgb: COLORS.borderColor } },
  },
};

const S_CELL: XLSX.CellStyle = {
  font: { sz: 10, name: "Calibri", color: { rgb: COLORS.black } },
  alignment: { vertical: "center", wrapText: true },
  border: {
    bottom: { style: "thin", color: { rgb: COLORS.borderColor } },
  },
};

const S_CELL_CENTER: XLSX.CellStyle = {
  ...S_CELL,
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

const S_ALT_ROW: XLSX.CellStyle = {
  ...S_CELL,
  fill: { fgColor: { rgb: COLORS.altRowBg } },
};

const S_ALT_ROW_CENTER: XLSX.CellStyle = {
  ...S_CELL_CENTER,
  fill: { fgColor: { rgb: COLORS.altRowBg } },
};

const S_COVER_LABEL: XLSX.CellStyle = {
  font: { bold: true, sz: 11, name: "Calibri", color: { rgb: COLORS.darkBlue } },
  alignment: { vertical: "center" },
};

const S_COVER_VALUE: XLSX.CellStyle = {
  font: { sz: 11, name: "Calibri", color: { rgb: COLORS.black } },
  alignment: { vertical: "center" },
};

const S_SECTION_HEADER: XLSX.CellStyle = {
  font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" },
  fill: { fgColor: { rgb: COLORS.gold } },
  alignment: { horizontal: "left", vertical: "center" },
};

const S_STAT_LABEL: XLSX.CellStyle = {
  font: { bold: true, sz: 10, name: "Calibri", color: { rgb: COLORS.darkBlue } },
  alignment: { horizontal: "right", vertical: "center" },
  border: { bottom: { style: "thin", color: { rgb: COLORS.borderColor } } },
};

const S_STAT_VALUE: XLSX.CellStyle = {
  font: { bold: true, sz: 12, name: "Calibri", color: { rgb: COLORS.red } },
  alignment: { horizontal: "center", vertical: "center" },
  border: { bottom: { style: "thin", color: { rgb: COLORS.borderColor } } },
};

// DOFA section colors
const DOFA_COLORS: Record<string, { header: string; bg: string }> = {
  debilidades: { header: "E74C3C", bg: "FDEDEC" },
  oportunidades: { header: "27AE60", bg: "EAFAF1" },
  fortalezas: { header: "2980B9", bg: "EBF5FB" },
  amenazas: { header: "F39C12", bg: "FEF9E7" },
};

// ============================================================
// Helpers
// ============================================================

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map(w => ({ wch: w }));
}

function setRowHeight(ws: XLSX.WorkSheet, row: number, height: number) {
  if (!ws["!rows"]) ws["!rows"] = [];
  ws["!rows"][row] = { hpt: height };
}

/** Apply a style to a range of cells */
function applyStyle(ws: XLSX.WorkSheet, startRow: number, startCol: number, endRow: number, endCol: number, style: XLSX.CellStyle) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      ws[addr].s = style;
    }
  }
}

/** Apply alternating row styles to data rows */
function applyDataStyles(ws: XLSX.WorkSheet, headerRow: number, dataStartRow: number, dataEndRow: number, colCount: number, centerCols: number[] = []) {
  // Style the title row (headerRow - 1 if it exists)
  if (headerRow > 0) {
    applyStyle(ws, headerRow - 1, 0, headerRow - 1, colCount - 1, S_TITLE);
    setRowHeight(ws, headerRow - 1, 28);
  }
  // Style header row
  applyStyle(ws, headerRow, 0, headerRow, colCount - 1, S_HEADER);
  setRowHeight(ws, headerRow, 24);

  // Style data rows with alternating colors
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const isAlt = (r - dataStartRow) % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      const isCenter = centerCols.includes(c);
      if (isAlt) {
        ws[addr].s = isCenter ? S_ALT_ROW_CENTER : S_ALT_ROW;
      } else {
        ws[addr].s = isCenter ? S_CELL_CENTER : S_CELL;
      }
    }
  }
}

// ============================================================
// Shared label maps
// ============================================================

const levelNames: Record<number, string> = {
  1: "Director", 2: "Gerente", 3: "Coordinador", 4: "Analista", 5: "Auxiliar",
};
const freqLabels: Record<string, string> = { dia: "Diario", semana: "Semanal", mes: "Mensual" };
const impactLabels = ["", "Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
const difficultyLabels = ["", "Muy Difícil", "Difícil", "Moderado", "Fácil", "Muy Fácil"];
const statusLabels: Record<string, string> = {
  por_priorizar: "Por Priorizar", en_ejecucion: "En Ejecución",
  finalizado: "Finalizado", suspendido: "Suspendido", cancelado: "Cancelado",
};
const moduleLabels: Record<string, string> = {
  orgHierarchies: "Organigrama", orgCollaborators: "Colaboradores",
  collaboratorFunctions: "Funciones de Colaborador", kpis: "KPIs", dofaMatrix: "DOFA",
  processInteractions: "Proveedores/Clientes", interactionTasks: "Tareas de Interacción",
  interactionStrengths: "Fortalezas/Oportunidades", projects: "Proyectos",
};
const actionLabels: Record<string, string> = {
  create: "Creación", update: "Modificación", delete: "Eliminación",
};

// ============================================================
// Build Individual Workbook
// ============================================================

export function buildExcelWorkbook(
  orgData: OrgChartData,
  kpisData: KPIsData,
  dofaData: DofaData,
  interactionsData: InteractionsData,
  projectsData?: ProjectsData,
  auditData?: AuditLogEntry[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const processName = orgData.process?.processName ?? "Sin nombre";
  const areaName = orgData.process?.areaName ?? "";

  // ── Sheet 1: Portada ──────────────────────────────────────
  const coverData = [
    ["LOGÍSTICA INTELIGENTE SOLUTION", ""],
    ["Levantamiento de Estado Actual de Procesos", ""],
    ["", ""],
    ["Proceso:", processName],
    ["Área:", areaName],
    ["Fecha de exportación:", new Date().toLocaleDateString("es-CO")],
    ["", ""],
    ["Módulos incluidos:", ""],
    ["1.", "Organigrama del Área"],
    ["2.", "KPIs del Proceso"],
    ["3.", "Análisis DOFA"],
    ["4.", "Proveedores del Proceso"],
    ["5.", "Clientes del Proceso"],
    ["6.", "Proyectos del Área"],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  setColWidths(wsCover, [25, 50]);
  wsCover["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];
  // Style cover
  applyStyle(wsCover, 0, 0, 0, 1, S_TITLE);
  setRowHeight(wsCover, 0, 36);
  applyStyle(wsCover, 1, 0, 1, 1, { font: { bold: true, sz: 12, color: { rgb: COLORS.darkBlue }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } });
  setRowHeight(wsCover, 1, 24);
  for (let r = 3; r <= 5; r++) {
    applyStyle(wsCover, r, 0, r, 0, S_COVER_LABEL);
    applyStyle(wsCover, r, 1, r, 1, S_COVER_VALUE);
  }
  applyStyle(wsCover, 7, 0, 7, 1, { font: { bold: true, sz: 11, color: { rgb: COLORS.red }, name: "Calibri" }, alignment: { vertical: "center" } });
  for (let r = 8; r <= 13; r++) {
    applyStyle(wsCover, r, 0, r, 0, { font: { bold: true, sz: 10, color: { rgb: COLORS.darkBlue }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } });
    applyStyle(wsCover, r, 1, r, 1, S_COVER_VALUE);
  }
  XLSX.utils.book_append_sheet(wb, wsCover, "Portada");

  // ── Sheet 2: Organigrama ──────────────────────────────────
  const orgRows: any[][] = [
    ["ORGANIGRAMA DEL ÁREA", "", "", "", ""],
    ["Nivel", "Nombre del Cargo", "Colaborador", "Posición", "Funciones"],
  ];

  for (const hierarchy of orgData.hierarchies) {
    const ln = levelNames[hierarchy.level] ?? `Nivel ${hierarchy.level}`;
    const collabs = orgData.collaborators.filter((c: any) => c.hierarchyId === hierarchy.id);
    if (collabs.length === 0) {
      orgRows.push([ln, hierarchy.name, "", "", ""]);
    } else {
      for (const collab of collabs) {
        const funcs = orgData.functions
          .filter((f: any) => f.collaboratorId === collab.id)
          .map((f: any) => f.description)
          .join(" | ");
        orgRows.push([ln, hierarchy.name, collab.name, collab.position ?? "", funcs]);
      }
    }
  }

  const wsOrg = XLSX.utils.aoa_to_sheet(orgRows);
  wsOrg["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  setColWidths(wsOrg, [15, 25, 25, 25, 60]);
  applyDataStyles(wsOrg, 1, 2, orgRows.length - 1, 5, [0]);
  applyStyle(wsOrg, 0, 0, 0, 4, S_TITLE);
  setRowHeight(wsOrg, 0, 28);
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organigrama");

  // ── Sheet 3: KPIs ─────────────────────────────────────────
  const kpiRows: any[][] = [
    ["KPIs DEL PROCESO", "", "", "", "", ""],
    ["#", "Nombre del KPI", "Objetivo", "Fórmula de Cálculo", "Frecuencia", "Responsable"],
  ];

  kpisData.kpis.forEach((kpi: any, i: number) => {
    kpiRows.push([
      i + 1,
      kpi.name,
      kpi.objective,
      kpi.formula,
      freqLabels[kpi.frequency] ?? kpi.frequency,
      kpi.responsible,
    ]);
  });

  const wsKPIs = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKPIs["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  setColWidths(wsKPIs, [5, 30, 40, 40, 12, 25]);
  applyDataStyles(wsKPIs, 1, 2, kpiRows.length - 1, 6, [0, 4]);
  applyStyle(wsKPIs, 0, 0, 0, 5, S_TITLE);
  setRowHeight(wsKPIs, 0, 28);
  XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs");

  // ── Sheet 4: DOFA ─────────────────────────────────────────
  const dofa = dofaData.dofa;
  const dofaRows: any[][] = [
    ["ANÁLISIS DOFA", "", "", ""],
    ["DEBILIDADES", "OPORTUNIDADES", "FORTALEZAS", "AMENAZAS"],
  ];

  const maxLen = Math.max(
    dofa?.debilidades?.length ?? 0,
    dofa?.oportunidades?.length ?? 0,
    dofa?.fortalezas?.length ?? 0,
    dofa?.amenazas?.length ?? 0,
    1
  );

  for (let i = 0; i < maxLen; i++) {
    dofaRows.push([
      dofa?.debilidades?.[i] ?? "",
      dofa?.oportunidades?.[i] ?? "",
      dofa?.fortalezas?.[i] ?? "",
      dofa?.amenazas?.[i] ?? "",
    ]);
  }

  const wsDofa = XLSX.utils.aoa_to_sheet(dofaRows);
  wsDofa["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  setColWidths(wsDofa, [40, 40, 40, 40]);
  applyStyle(wsDofa, 0, 0, 0, 3, S_TITLE);
  setRowHeight(wsDofa, 0, 28);
  // DOFA colored headers
  const dofaCols = ["debilidades", "oportunidades", "fortalezas", "amenazas"];
  dofaCols.forEach((key, c) => {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (!wsDofa[addr]) wsDofa[addr] = { v: key.toUpperCase(), t: "s" };
    wsDofa[addr].s = {
      font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" },
      fill: { fgColor: { rgb: DOFA_COLORS[key].header } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  setRowHeight(wsDofa, 1, 24);
  // Data rows with DOFA column backgrounds
  for (let r = 2; r < dofaRows.length; r++) {
    dofaCols.forEach((key, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!wsDofa[addr]) wsDofa[addr] = { v: "", t: "s" };
      wsDofa[addr].s = {
        font: { sz: 10, name: "Calibri", color: { rgb: COLORS.black } },
        fill: { fgColor: { rgb: DOFA_COLORS[key].bg } },
        alignment: { vertical: "center", wrapText: true },
        border: { bottom: { style: "thin", color: { rgb: COLORS.borderColor } } },
      };
    });
  }
  XLSX.utils.book_append_sheet(wb, wsDofa, "DOFA");

  // ── Sheet 5: Proveedores ──────────────────────────────────
  buildInteractionSheet(wb, interactionsData.interactions, "proveedor", "PROVEEDORES DEL PROCESO", "Proceso Proveedor", "Proveedores");

  // ── Sheet 6: Clientes ─────────────────────────────────────
  buildInteractionSheet(wb, interactionsData.interactions, "cliente", "CLIENTES DEL PROCESO", "Proceso Cliente", "Clientes");

  // ── Sheet 7: Proyectos ─────────────────────────────────────────────
  if (projectsData) {
    buildProjectsSheet(wb, projectsData.projects, "PROYECTOS DEL ÁREA", "Proyectos", false);
  }

  // ── Sheet 8: Historial de Cambios ─────────────────────────
  if (auditData && auditData.length > 0) {
    buildAuditSheet(wb, auditData);
  }

  return wb;
}

// ============================================================
// Build Consolidated Workbook (multiple processes)
// ============================================================

export function buildConsolidatedExcelWorkbook(
  processesData: any[],
  auditData?: AuditLogEntry[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Compute statistics for the cover ──────────────────────
  let totalCollaborators = 0;
  let totalKPIs = 0;
  let totalProjects = 0;
  let totalProveedores = 0;
  let totalClientes = 0;
  let totalDofaItems = 0;

  const perProcessStats: any[] = [];

  for (const item of processesData) {
    const pName = item.process?.processName ?? "Sin nombre";
    const collabs = (item.collaborators ?? []).length;
    const kpis = (item.kpis ?? []).length;
    const projs = (item.projects ?? []).length;
    const provs = (item.interactions ?? []).filter((i: any) => i.type === "proveedor").length;
    const clis = (item.interactions ?? []).filter((i: any) => i.type === "cliente").length;
    const dofaCount = (item.dofa?.debilidades?.length ?? 0) + (item.dofa?.oportunidades?.length ?? 0) +
      (item.dofa?.fortalezas?.length ?? 0) + (item.dofa?.amenazas?.length ?? 0);

    totalCollaborators += collabs;
    totalKPIs += kpis;
    totalProjects += projs;
    totalProveedores += provs;
    totalClientes += clis;
    totalDofaItems += dofaCount;

    perProcessStats.push({ name: pName, collabs, kpis, projs, provs, clis, dofaCount });
  }

  // ── Sheet 1: Portada con Resumen Estadístico ──────────────
  const coverData: any[][] = [
    ["LOGÍSTICA INTELIGENTE SOLUTION", "", "", "", ""],
    ["Levantamiento Consolidado de Procesos", "", "", "", ""],
    ["", "", "", "", ""],
    ["Fecha de exportación:", new Date().toLocaleDateString("es-CO"), "", "", ""],
    [`Procesos incluidos:`, String(processesData.length), "", "", ""],
    ["", "", "", "", ""],
    // Stats summary
    ["RESUMEN ESTADÍSTICO", "", "", "", ""],
    ["Total Colaboradores:", String(totalCollaborators), "Total KPIs:", String(totalKPIs), ""],
    ["Total Proveedores:", String(totalProveedores), "Total Clientes:", String(totalClientes), ""],
    ["Total Proyectos:", String(totalProjects), "Items DOFA:", String(totalDofaItems), ""],
    ["", "", "", "", ""],
    // Per-process table
    ["DETALLE POR PROCESO", "", "", "", ""],
    ["Proceso", "Colaboradores", "KPIs", "Proveedores", "Clientes", "Proyectos", "Items DOFA"],
  ];

  for (const ps of perProcessStats) {
    coverData.push([ps.name, ps.collabs, ps.kpis, ps.provs, ps.clis, ps.projs, ps.dofaCount]);
  }

  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  setColWidths(wsCover, [30, 18, 18, 18, 18, 18, 18]);
  wsCover["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 6 } },
  ];

  // Style cover
  applyStyle(wsCover, 0, 0, 0, 4, S_TITLE);
  setRowHeight(wsCover, 0, 36);
  applyStyle(wsCover, 1, 0, 1, 4, { font: { bold: true, sz: 12, color: { rgb: COLORS.darkBlue }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } });
  setRowHeight(wsCover, 1, 24);
  // Date & count
  applyStyle(wsCover, 3, 0, 3, 0, S_COVER_LABEL);
  applyStyle(wsCover, 3, 1, 3, 1, S_COVER_VALUE);
  applyStyle(wsCover, 4, 0, 4, 0, S_COVER_LABEL);
  applyStyle(wsCover, 4, 1, 4, 1, S_STAT_VALUE);
  // Stats section header
  applyStyle(wsCover, 6, 0, 6, 4, { font: { bold: true, color: { rgb: COLORS.white }, sz: 12, name: "Calibri" }, fill: { fgColor: { rgb: COLORS.gold } }, alignment: { horizontal: "center", vertical: "center" } });
  setRowHeight(wsCover, 6, 26);
  // Stats rows
  for (let r = 7; r <= 9; r++) {
    applyStyle(wsCover, r, 0, r, 0, S_STAT_LABEL);
    applyStyle(wsCover, r, 1, r, 1, S_STAT_VALUE);
    applyStyle(wsCover, r, 2, r, 2, S_STAT_LABEL);
    applyStyle(wsCover, r, 3, r, 3, S_STAT_VALUE);
  }
  // Per-process table header
  applyStyle(wsCover, 11, 0, 11, 6, { font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" }, fill: { fgColor: { rgb: COLORS.red } }, alignment: { horizontal: "center", vertical: "center" } });
  setRowHeight(wsCover, 11, 26);
  applyStyle(wsCover, 12, 0, 12, 6, S_HEADER);
  setRowHeight(wsCover, 12, 22);
  // Per-process data rows
  for (let r = 13; r < coverData.length; r++) {
    const isAlt = (r - 13) % 2 === 1;
    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!wsCover[addr]) wsCover[addr] = { v: "", t: "s" };
      const isCenter = c > 0;
      if (isAlt) {
        wsCover[addr].s = isCenter ? S_ALT_ROW_CENTER : S_ALT_ROW;
      } else {
        wsCover[addr].s = isCenter ? S_CELL_CENTER : S_CELL;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsCover, "Portada");

  // ── Sheet 2: Organigrama Consolidado ──────────────────────
  const orgRows: any[][] = [
    ["ORGANIGRAMA CONSOLIDADO", "", "", "", "", ""],
    ["Proceso", "Nivel", "Nombre del Cargo", "Colaborador", "Posición", "Funciones"],
  ];
  for (const item of processesData) {
    const pName = item.process?.processName ?? "Sin nombre";
    const hierarchies = item.hierarchies ?? [];
    const collaborators = item.collaborators ?? [];
    const functions = item.functions ?? [];
    for (const hierarchy of hierarchies) {
      const ln = levelNames[hierarchy.level] ?? `Nivel ${hierarchy.level}`;
      const collabs = collaborators.filter((c: any) => c.hierarchyId === hierarchy.id);
      if (collabs.length === 0) {
        orgRows.push([pName, ln, hierarchy.name, "", "", ""]);
      } else {
        for (const collab of collabs) {
          const funcs = functions
            .filter((f: any) => f.collaboratorId === collab.id)
            .map((f: any) => f.description)
            .join(" | ");
          orgRows.push([pName, ln, hierarchy.name, collab.name, collab.position ?? "", funcs]);
        }
      }
    }
  }
  const wsOrg = XLSX.utils.aoa_to_sheet(orgRows);
  wsOrg["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  setColWidths(wsOrg, [25, 15, 25, 25, 25, 60]);
  applyDataStyles(wsOrg, 1, 2, orgRows.length - 1, 6, [1]);
  applyStyle(wsOrg, 0, 0, 0, 5, S_TITLE);
  setRowHeight(wsOrg, 0, 28);
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organigrama");

  // ── Sheet 3: KPIs Consolidado ─────────────────────────────
  const kpiRows: any[][] = [
    ["KPIs CONSOLIDADO", "", "", "", "", "", ""],
    ["Proceso", "#", "Nombre del KPI", "Objetivo", "Fórmula de Cálculo", "Frecuencia", "Responsable"],
  ];
  for (const item of processesData) {
    const pName = item.process?.processName ?? "Sin nombre";
    (item.kpis ?? []).forEach((kpi: any, i: number) => {
      kpiRows.push([
        i === 0 ? pName : "",
        i + 1,
        kpi.name,
        kpi.objective,
        kpi.formula,
        freqLabels[kpi.frequency] ?? kpi.frequency,
        kpi.responsible,
      ]);
    });
  }
  const wsKPIs = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKPIs["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  setColWidths(wsKPIs, [25, 5, 30, 40, 40, 12, 25]);
  applyDataStyles(wsKPIs, 1, 2, kpiRows.length - 1, 7, [1, 5]);
  applyStyle(wsKPIs, 0, 0, 0, 6, S_TITLE);
  setRowHeight(wsKPIs, 0, 28);
  XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs");

  // ── Sheet 4: DOFA Consolidado ─────────────────────────────
  const dofaRows: any[][] = [
    ["ANÁLISIS DOFA CONSOLIDADO", "", "", "", ""],
    ["Proceso", "DEBILIDADES", "OPORTUNIDADES", "FORTALEZAS", "AMENAZAS"],
  ];
  for (const item of processesData) {
    const pName = item.process?.processName ?? "Sin nombre";
    const dofa = item.dofa;
    if (!dofa) {
      dofaRows.push([pName, "Sin datos", "", "", ""]);
      continue;
    }
    const maxL = Math.max(
      dofa.debilidades?.length ?? 0, dofa.oportunidades?.length ?? 0,
      dofa.fortalezas?.length ?? 0, dofa.amenazas?.length ?? 0, 1
    );
    for (let i = 0; i < maxL; i++) {
      dofaRows.push([
        i === 0 ? pName : "",
        dofa.debilidades?.[i] ?? "",
        dofa.oportunidades?.[i] ?? "",
        dofa.fortalezas?.[i] ?? "",
        dofa.amenazas?.[i] ?? "",
      ]);
    }
  }
  const wsDofa = XLSX.utils.aoa_to_sheet(dofaRows);
  wsDofa["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  setColWidths(wsDofa, [25, 40, 40, 40, 40]);
  applyStyle(wsDofa, 0, 0, 0, 4, S_TITLE);
  setRowHeight(wsDofa, 0, 28);
  // Process column header
  const dofaHeaderAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (!wsDofa[dofaHeaderAddr]) wsDofa[dofaHeaderAddr] = { v: "Proceso", t: "s" };
  wsDofa[dofaHeaderAddr].s = S_HEADER;
  // DOFA colored headers
  const dofaCols = ["debilidades", "oportunidades", "fortalezas", "amenazas"];
  dofaCols.forEach((key, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 1, c: ci + 1 });
    if (!wsDofa[addr]) wsDofa[addr] = { v: key.toUpperCase(), t: "s" };
    wsDofa[addr].s = {
      font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" },
      fill: { fgColor: { rgb: DOFA_COLORS[key].header } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  setRowHeight(wsDofa, 1, 24);
  // Data rows
  for (let r = 2; r < dofaRows.length; r++) {
    // Process column
    const pAddr = XLSX.utils.encode_cell({ r, c: 0 });
    if (!wsDofa[pAddr]) wsDofa[pAddr] = { v: "", t: "s" };
    wsDofa[pAddr].s = (r - 2) % 2 === 1 ? S_ALT_ROW : S_CELL;
    // DOFA columns with colored backgrounds
    dofaCols.forEach((key, ci) => {
      const addr = XLSX.utils.encode_cell({ r, c: ci + 1 });
      if (!wsDofa[addr]) wsDofa[addr] = { v: "", t: "s" };
      wsDofa[addr].s = {
        font: { sz: 10, name: "Calibri", color: { rgb: COLORS.black } },
        fill: { fgColor: { rgb: DOFA_COLORS[key].bg } },
        alignment: { vertical: "center", wrapText: true },
        border: { bottom: { style: "thin", color: { rgb: COLORS.borderColor } } },
      };
    });
  }
  XLSX.utils.book_append_sheet(wb, wsDofa, "DOFA");

  // ── Sheet 5: Proveedores Consolidado ──────────────────────
  const allInteractions: any[] = [];
  for (const item of processesData) {
    for (const inter of (item.interactions ?? [])) {
      allInteractions.push({ ...inter, _processName: item.process?.processName ?? "Sin nombre" });
    }
  }
  buildConsolidatedInteractionSheet(wb, allInteractions, "proveedor", "PROVEEDORES CONSOLIDADO", "Proceso Proveedor", "Proveedores");

  // ── Sheet 6: Clientes Consolidado ─────────────────────────
  buildConsolidatedInteractionSheet(wb, allInteractions, "cliente", "CLIENTES CONSOLIDADO", "Proceso Cliente", "Clientes");

  // ── Sheet 7: Proyectos Consolidado ────────────────────────
  const allProjects: any[] = [];
  for (const item of processesData) {
    for (const proj of (item.projects ?? [])) {
      allProjects.push({ ...proj, _processName: item.process?.processName ?? "Sin nombre" });
    }
  }
  buildProjectsSheet(wb, allProjects, "PROYECTOS CONSOLIDADO", "Proyectos", true);

  // ── Sheet 8: Historial de Cambios ─────────────────────────
  if (auditData && auditData.length > 0) {
    buildAuditSheet(wb, auditData);
  }

  return wb;
}

// ============================================================
// Shared Sheet Builders
// ============================================================

function buildInteractionSheet(
  wb: XLSX.WorkBook,
  interactions: any[],
  type: string,
  title: string,
  colLabel: string,
  sheetName: string
) {
  const filtered = interactions.filter((i: any) => i.type === type);
  const rows: any[][] = [
    [title, "", "", "", "", "", ""],
    [colLabel, "Tarea / Actividad", "Documento / Ruta", "Responsable", "ANS (Tiempo)", "Cumplimiento (1-5)", "Fortalezas / Oportunidades"],
  ];

  for (const item of filtered) {
    if (item.tasks?.length === 0 && item.strengths?.length === 0) {
      rows.push([item.relatedProcessName, "", "", "", "", "", ""]);
    } else {
      const maxR = Math.max(item.tasks?.length ?? 0, item.strengths?.length ?? 0, 1);
      for (let i = 0; i < maxR; i++) {
        const task = item.tasks?.[i];
        const strength = item.strengths?.[i];
        const ansText = task?.ansUndefined ? "No definido" : (task ? `${task.ansNumber} ${task.ansType?.replace("_", " ")} | ${task.ansCompliance}/5` : "");
        rows.push([
          i === 0 ? item.relatedProcessName : "",
          task?.taskActivity ?? "",
          task?.documentRoute ?? "",
          task?.responsibleRole ?? "",
          task ? ansText : "",
          task?.ansCompliance ?? "",
          strength ? `[${strength.type.toUpperCase()}] ${strength.description}` : "",
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  setColWidths(ws, [25, 35, 25, 25, 25, 12, 40]);
  applyDataStyles(ws, 1, 2, rows.length - 1, 7, [4, 5]);
  applyStyle(ws, 0, 0, 0, 6, S_TITLE);
  setRowHeight(ws, 0, 28);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function buildConsolidatedInteractionSheet(
  wb: XLSX.WorkBook,
  allInteractions: any[],
  type: string,
  title: string,
  colLabel: string,
  sheetName: string
) {
  const filtered = allInteractions.filter((i: any) => i.type === type);
  const rows: any[][] = [
    [title, "", "", "", "", "", "", ""],
    ["Proceso", colLabel, "Tarea / Actividad", "Documento / Ruta", "Responsable", "ANS (Tiempo)", "Cumplimiento (1-5)", "Fortalezas / Oportunidades"],
  ];

  for (const item of filtered) {
    const pName = item._processName ?? "";
    if (item.tasks?.length === 0 && item.strengths?.length === 0) {
      rows.push([pName, item.relatedProcessName, "", "", "", "", "", ""]);
    } else {
      const maxR = Math.max(item.tasks?.length ?? 0, item.strengths?.length ?? 0, 1);
      for (let i = 0; i < maxR; i++) {
        const task = item.tasks?.[i];
        const strength = item.strengths?.[i];
        const ansText = task?.ansUndefined ? "No definido" : (task ? `${task.ansNumber} ${task.ansType?.replace("_", " ")} | ${task.ansCompliance}/5` : "");
        rows.push([
          i === 0 ? pName : "",
          i === 0 ? item.relatedProcessName : "",
          task?.taskActivity ?? "",
          task?.documentRoute ?? "",
          task?.responsibleRole ?? "",
          task ? ansText : "",
          task?.ansCompliance ?? "",
          strength ? `[${strength.type.toUpperCase()}] ${strength.description}` : "",
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  setColWidths(ws, [25, 25, 35, 25, 25, 25, 12, 40]);
  applyDataStyles(ws, 1, 2, rows.length - 1, 8, [5, 6]);
  applyStyle(ws, 0, 0, 0, 7, S_TITLE);
  setRowHeight(ws, 0, 28);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function buildProjectsSheet(
  wb: XLSX.WorkBook,
  projects: any[],
  title: string,
  sheetName: string,
  includeProcess: boolean
) {
  const sorted = [...projects].sort((a: any, b: any) => (b.impact * b.difficulty) - (a.impact * a.difficulty));

  const headers = includeProcess
    ? ["Proceso", "#", "Nombre del Proyecto", "Descripción", "Impacto", "Dificultad", "Score (I×D)", "Estado"]
    : ["#", "Nombre del Proyecto", "Descripción", "Impacto", "Dificultad", "Score (I×D)", "Estado"];

  const colCount = headers.length;
  const rows: any[][] = [
    [title, ...Array(colCount - 1).fill("")],
    headers,
  ];

  sorted.forEach((p: any, i: number) => {
    const row = includeProcess
      ? [
          p._processName ?? "",
          i + 1,
          p.name,
          p.description ?? "",
          `${p.impact} — ${impactLabels[p.impact] ?? p.impact}`,
          `${p.difficulty} — ${difficultyLabels[p.difficulty] ?? p.difficulty}`,
          p.impact * p.difficulty,
          statusLabels[p.status] ?? p.status,
        ]
      : [
          i + 1,
          p.name,
          p.description ?? "",
          `${p.impact} — ${impactLabels[p.impact] ?? p.impact}`,
          `${p.difficulty} — ${difficultyLabels[p.difficulty] ?? p.difficulty}`,
          p.impact * p.difficulty,
          statusLabels[p.status] ?? p.status,
        ];
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  const widths = includeProcess
    ? [25, 5, 35, 50, 18, 18, 12, 18]
    : [5, 35, 50, 18, 18, 12, 18];
  setColWidths(ws, widths);
  const centerCols = includeProcess ? [1, 4, 5, 6, 7] : [0, 3, 4, 5, 6];
  applyDataStyles(ws, 1, 2, rows.length - 1, colCount, centerCols);
  applyStyle(ws, 0, 0, 0, colCount - 1, S_TITLE);
  setRowHeight(ws, 0, 28);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function buildAuditSheet(wb: XLSX.WorkBook, auditData: AuditLogEntry[]) {
  const rows: any[][] = [
    ["HISTORIAL DE CAMBIOS", "", "", "", "", "", "", "", ""],
    ["#", "Fecha", "Módulo", "Acción", "Descripción", "Usuario", "Email", "Área/Proceso", "Restaurado"],
  ];

  auditData.forEach((entry, i) => {
    rows.push([
      i + 1,
      entry.fecha,
      moduleLabels[entry.modulo] ?? entry.modulo,
      actionLabels[entry.accion] ?? entry.accion,
      entry.descripcion,
      entry.usuario,
      entry.email,
      entry.area,
      entry.restaurado,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  setColWidths(ws, [5, 20, 20, 14, 50, 25, 30, 25, 10]);
  applyDataStyles(ws, 1, 2, rows.length - 1, 9, [0, 2, 3, 8]);
  applyStyle(ws, 0, 0, 0, 8, S_TITLE);
  setRowHeight(ws, 0, 28);
  XLSX.utils.book_append_sheet(wb, ws, "Historial");
}

// ============================================================
// Download / Share
// ============================================================

export async function downloadExcel(wb: XLSX.WorkBook, filename: string): Promise<void> {
  if (Platform.OS === "web") {
    // Web: trigger browser download
    XLSX.writeFile(wb, filename);
    return;
  }

  // Native: write to file system and share
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar Levantamiento LIS",
      UTI: "com.microsoft.excel.xlsx",
    });
  }
}
