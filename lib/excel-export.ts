import * as XLSX from "xlsx";
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

// ============================================================
// Helpers
// ============================================================

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "CC2229" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "FFFFFF" } },
    bottom: { style: "thin", color: { rgb: "FFFFFF" } },
    left: { style: "thin", color: { rgb: "FFFFFF" } },
    right: { style: "thin", color: { rgb: "FFFFFF" } },
  },
};

const SUBHEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
  fill: { fgColor: { rgb: "1B4F9B" } },
  alignment: { horizontal: "center", vertical: "center" },
};

function applyHeaderStyles(ws: XLSX.WorkSheet, range: string, style: any) {
  const ref = XLSX.utils.decode_range(range);
  for (let C = ref.s.c; C <= ref.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: ref.s.r, c: C });
    if (!ws[cellAddr]) ws[cellAddr] = { v: "", t: "s" };
    ws[cellAddr].s = style;
  }
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map(w => ({ wch: w }));
}

// ============================================================
// Build Workbook
// ============================================================

export function buildExcelWorkbook(
  orgData: OrgChartData,
  kpisData: KPIsData,
  dofaData: DofaData,
  interactionsData: InteractionsData
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const processName = orgData.process?.processName ?? "Sin nombre";
  const areaName = orgData.process?.areaName ?? "";

  // ── Sheet 1: Portada ──────────────────────────────────────
  const coverData = [
    ["LOGÍSTICA INTELIGENTE SOLUTION"],
    ["Levantamiento de Estado Actual de Procesos"],
    [""],
    ["Proceso:", processName],
    ["Área:", areaName],
    ["Fecha de exportación:", new Date().toLocaleDateString("es-CO")],
    [""],
    ["Módulos incluidos:"],
    ["1. Organigrama del Área"],
    ["2. KPIs del Proceso"],
    ["3. Análisis DOFA"],
    ["4. Proveedores del Proceso"],
    ["5. Clientes del Proceso"],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  setColWidths(wsCover, [35, 50]);
  XLSX.utils.book_append_sheet(wb, wsCover, "Portada");

  // ── Sheet 2: Organigrama ──────────────────────────────────
  const orgRows: any[][] = [
    ["ORGANIGRAMA DEL ÁREA", "", "", "", ""],
    ["Nivel", "Nombre del Cargo", "Colaborador", "Posición", "Funciones"],
  ];

  const levelNames: Record<number, string> = {
    1: "Director", 2: "Gerente", 3: "Coordinador", 4: "Analista", 5: "Auxiliar",
  };

  for (const hierarchy of orgData.hierarchies) {
    const levelName = levelNames[hierarchy.level] ?? `Nivel ${hierarchy.level}`;
    const collabs = orgData.collaborators.filter((c: any) => c.hierarchyId === hierarchy.id);
    if (collabs.length === 0) {
      orgRows.push([levelName, hierarchy.name, "", "", ""]);
    } else {
      for (const collab of collabs) {
        const funcs = orgData.functions
          .filter((f: any) => f.collaboratorId === collab.id)
          .map((f: any) => f.description)
          .join(" | ");
        orgRows.push([levelName, hierarchy.name, collab.name, collab.position ?? "", funcs]);
      }
    }
  }

  const wsOrg = XLSX.utils.aoa_to_sheet(orgRows);
  wsOrg["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  setColWidths(wsOrg, [15, 25, 25, 25, 60]);
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organigrama");

  // ── Sheet 3: KPIs ─────────────────────────────────────────
  const kpiRows: any[][] = [
    ["KPIs DEL PROCESO", "", "", "", ""],
    ["#", "Nombre del KPI", "Objetivo", "Fórmula de Cálculo", "Frecuencia", "Responsable"],
  ];

  const freqLabels: Record<string, string> = { dia: "Diario", semana: "Semanal", mes: "Mensual" };

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
  XLSX.utils.book_append_sheet(wb, wsDofa, "DOFA");

  // ── Sheet 5: Proveedores ──────────────────────────────────
  const proveedores = interactionsData.interactions.filter((i: any) => i.type === "proveedor");
  const provRows: any[][] = [
    ["PROVEEDORES DEL PROCESO", "", "", "", "", "", ""],
    ["Proceso Proveedor", "Tarea / Actividad", "Documento / Ruta", "Responsable", "ANS (Tiempo)", "Cumplimiento (1-5)", "Fortalezas / Oportunidades"],
  ];

  for (const prov of proveedores) {
    if (prov.tasks?.length === 0 && prov.strengths?.length === 0) {
      provRows.push([prov.relatedProcessName, "", "", "", "", "", ""]);
    } else {
      const maxRows = Math.max(prov.tasks?.length ?? 0, prov.strengths?.length ?? 0, 1);
      for (let i = 0; i < maxRows; i++) {
        const task = prov.tasks?.[i];
        const strength = prov.strengths?.[i];
        const ansText = task?.ansUndefined ? "No definido" : (task ? `${task.ansNumber} ${task.ansType?.replace("_", " ")} | ${task.ansCompliance}/5` : "");
        provRows.push([
          i === 0 ? prov.relatedProcessName : "",
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

  const wsProveedores = XLSX.utils.aoa_to_sheet(provRows);
  wsProveedores["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  setColWidths(wsProveedores, [25, 35, 25, 25, 25, 12, 40]);
  XLSX.utils.book_append_sheet(wb, wsProveedores, "Proveedores");

  // ── Sheet 6: Clientes ─────────────────────────────────────
  const clientes = interactionsData.interactions.filter((i: any) => i.type === "cliente");
  const clientRows: any[][] = [
    ["CLIENTES DEL PROCESO", "", "", "", "", "", ""],
    ["Proceso Cliente", "Tarea / Actividad", "Documento / Ruta", "Responsable", "ANS (Tiempo)", "Cumplimiento (1-5)", "Fortalezas / Oportunidades"],
  ];

  for (const client of clientes) {
    if (client.tasks?.length === 0 && client.strengths?.length === 0) {
      clientRows.push([client.relatedProcessName, "", "", "", "", "", ""]);
    } else {
      const maxRows = Math.max(client.tasks?.length ?? 0, client.strengths?.length ?? 0, 1);
      for (let i = 0; i < maxRows; i++) {
        const task = client.tasks?.[i];
        const strength = client.strengths?.[i];
        const ansText = task?.ansUndefined ? "No definido" : (task ? `${task.ansNumber} ${task.ansType?.replace("_", " ")} | ${task.ansCompliance}/5` : "");
        clientRows.push([
          i === 0 ? client.relatedProcessName : "",
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

  const wsClientes = XLSX.utils.aoa_to_sheet(clientRows);
  wsClientes["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  setColWidths(wsClientes, [25, 35, 25, 25, 25, 12, 40]);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  return wb;
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
