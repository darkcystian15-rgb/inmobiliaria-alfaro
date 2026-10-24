import { propertyPanelId } from "./property-panel-id.mjs";
import type { ReportRow, ReportSummary, ReportValue } from "./report-types";

export type ReportExport = {
  title: string;
  description: string;
  columns: string[];
  labels: Record<string, string>;
  rows: ReportRow[];
  summary: ReportSummary | null;
  filters: string;
  generatedAt: Date;
};
const brand = "Inmobiliaria Alberto Alfaro";
const red = "C80000";

export function reportPDFLayout(columns: string[]) {
  const weights = columns.map(key =>
    ["posicion", "dias"].includes(key) ? 14 : key === "codigo" ? 40 :
      key.toLowerCase().includes("fecha") ? 24 :
        ["nombre", "propietario", "ubicacion", "situaciones", "motivoLiberacion"].includes(key) ? 40 : 28);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const orientation = total > 182 ? "landscape" : "portrait";
  const available = orientation === "landscape" ? 269 : 182;
  return { orientation, fontSize: columns.length > 10 ? 7 : 8,
    columnStyles: Object.fromEntries(columns.map((key, index) => [key, { cellWidth: available * weights[index] / (total || 1) }])) } as const;
}

export function reportDate(value: ReportValue): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (value === "") return null;
  // Date-only values are calendar dates, not UTC instants.
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00-05:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function reportText(key: string, value: ReportValue): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "—";
  if(key==='estadoPlazo')return ({vencido:'Vencido',vence_hoy:'Vence hoy',en_plazo:'En plazo',sin_plazo:'Sin plazo'} as Record<string,string>)[String(value)]??String(value);
  if(key==='actividadPendiente')return ({visita:'Visita',tasacion:'Tasación',expediente:'Texto comercial',publicacion:'Difusión'} as Record<string,string>)[String(value)]??String(value);
  if (key.toLowerCase().includes("fecha")) return reportDate(value)?.toLocaleDateString("es-PE", { timeZone: "America/Lima" }) ?? "—";
  if (["tasacion", "precioFinal", "comision", "rentaMensual", "rentaMensualSolicitada", "garantia", "adelanto"].includes(key) && Number.isFinite(Number(value))) return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value));
  return String(value);
}
export function reportCellValue(key: string, row: ReportRow): ReportValue {
  if (key === "codigo" && row.codigo) return propertyPanelId(row);
  if (key === "nombre" && typeof row.propietario === "string") return row.propietario || "Sin contacto";
  if (key === "motivoLiberacion" && row[key] === "venta_suspendida") return "Venta suspendida por el propietario";
  return row[key];
}

function stamp(date: Date) {
  return date.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
}
function filename(report: ReportExport, extension: string) {
  const title = report.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
  return `alfaro-${title}-${report.generatedAt.toLocaleDateString("en-CA", { timeZone: "America/Lima" })}.${extension}`;
}
async function logo() {
  const response = await fetch("/branding/logo.png");
  if (!response.ok) throw new Error("No se pudo cargar el logo de la inmobiliaria.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el logo."));
    reader.readAsDataURL(blob);
  });
}
function metrics(report: ReportExport): [string, number][] {
  if (!report.summary) return [];
  return [["Activos", report.summary.activos], ["Históricos", report.summary.historicos], ["Posiciones libres (zona)", report.summary.disponibles], ["Visitas pendientes", report.summary.visitasPendientes], ["Tasaciones pendientes", report.summary.tasacionesPendientes], ["Texto pendiente", report.summary.materialPendiente], ["Difusión completada", report.summary.publicados]];
}

export async function exportReportPDF(report: ReportExport) {
  if (!report.columns.length) throw new Error("Selecciona al menos una columna para descargar.");
  const [{ jsPDF }, { default: autoTable }, image] = await Promise.all([import("jspdf"), import("jspdf-autotable"), logo()]);
  const layout = reportPDFLayout(report.columns);
  const doc = new jsPDF({ orientation: layout.orientation, unit: "mm", format: "a4" });
  doc.setProperties({ title: report.title, author: brand, subject: report.description });
  const width = doc.internal.pageSize.getWidth();
  const properties = doc.getImageProperties(image);
  const logoHeight = Math.min(17, 48 * properties.height / properties.width);
  const logoWidth = logoHeight * properties.width / properties.height;
  const header = () => {
    doc.addImage(image, "PNG", 14, 10, logoWidth, logoHeight);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Generado: ${stamp(report.generatedAt)}`, width - 14, 15, { align: "right" });
    doc.setDrawColor(200, 0, 0); doc.setLineWidth(0.7); doc.line(14, 31, width - 14, 31);
  };
  header();
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(23);
  // Helvetica does not contain the arrow glyph used in flow report names.
  const titleLines = doc.splitTextToSize(report.title.replaceAll("→", ">"), width - 28);
  doc.text(titleLines, 14, 41);
  let y = 43 + titleLines.length * 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
  const description = doc.splitTextToSize(report.description, width - 28);
  doc.text(description, 14, y); y += description.length * 4 + 4;
  const filters = doc.splitTextToSize(`Filtros aplicados: ${report.filters}`, width - 28);
  doc.text(filters, 14, y); y += filters.length * 4 + 6;
  doc.setFont("helvetica", "bold"); doc.setTextColor(200, 0, 0);
  doc.text(`${report.rows.length} registros en este reporte`, 14, y); y += 6;
  if (report.summary) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(90); doc.setFontSize(8);
    const summary = doc.splitTextToSize(`Resumen del reporte (filtros aplicados): ${metrics(report).map(([label, value]) => `${label}: ${value}`).join(" · ")}`, width - 28);
    doc.text(summary, 14, y); y += summary.length * 4 + 5;
  }
  autoTable(doc, {
    startY: y,
    columns: report.columns.map(key => ({ header: report.labels[key] ?? key, dataKey: key })),
    body: report.rows.map(row => Object.fromEntries(report.columns.map(key => [key, reportText(key, reportCellValue(key, row))]))),
    theme: "striped",
    tableWidth: width - 28,
    columnStyles: layout.columnStyles,
    styles: { font: "helvetica", fontSize: layout.fontSize, cellPadding: 2, overflow: "linebreak", textColor: [55, 65, 81] },
    headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 247, 248] },
    margin: { top: 38, bottom: 18, left: 14, right: 14 },
    showHead: "everyPage", rowPageBreak: "avoid", horizontalPageBreak: false,
    willDrawPage: data => { if (data.pageNumber > 1) header(); },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220); doc.setLineWidth(0.2); doc.line(14, height - 14, width - 14, height - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110);
    doc.text(brand, 14, height - 9);
    doc.text(`Página ${page} de ${pages}`, width - 14, height - 9, { align: "right" });
  }
  doc.save(filename(report, "pdf"));
}

export async function exportReportExcel(report: ReportExport) {
  if (!report.columns.length) throw new Error("Selecciona al menos una columna para descargar.");
  const [ExcelJS, image] = await Promise.all([import("exceljs"), logo()]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = brand; workbook.created = report.generatedAt;
  const imageId = workbook.addImage({ base64: image, extension: "png" });
  const summary = workbook.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 32 }, { width: 32 }, { width: 25 }, { width: 25 }];
  const logoImage = new Image(); logoImage.src = image; await logoImage.decode();
  const logoHeight = Math.min(65, 220 * logoImage.naturalHeight / logoImage.naturalWidth);
  summary.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: logoHeight * logoImage.naturalWidth / logoImage.naturalHeight, height: logoHeight } });
  for (let row = 1; row <= 4; row++) summary.getRow(row).height = 20;
  const merged = (row: number, value: string) => { summary.mergeCells(row, 1, row, 4); summary.getCell(row, 1).value = value; summary.getCell(row, 1).alignment = { wrapText: true, vertical: "middle" }; };
  merged(5, report.title); summary.getRow(5).height = 32; summary.getCell("A5").font = { size: 20, bold: true, color: { argb: red } };
  merged(6, report.description); summary.getRow(6).height = 34;
  merged(7, `Generado: ${stamp(report.generatedAt)}`);
  merged(8, `Filtros aplicados: ${report.filters}`); summary.getRow(8).height = 50;
  summary.addRow([]);
  summary.addRow(["Registros del reporte", report.rows.length]);
  merged(12, "Resumen del reporte (filtros aplicados)"); summary.getCell("A12").font = { bold: true, color: { argb: red } };
  metrics(report).forEach(([label, value]) => summary.addRow([label, value]));
  summary.eachRow(row => row.eachCell(cell => { cell.font = { name: "Calibri", size: 11, ...cell.font }; }));
  const detail = workbook.addWorksheet("Detalle", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  detail.columns = report.columns.map(key => ({ key, width: key === "nombre" || key === "ubicacion" || key === "situaciones" ? 38 : key.includes("fecha") ? 18 : 24 }));
  detail.addTable({ name: "DetalleReporte", ref: "A1", headerRow: true, style: { theme: "TableStyleMedium2", showRowStripes: true }, columns: report.columns.map(key => ({ name: report.labels[key] ?? key, filterButton: true })), rows: report.rows.map(row => report.columns.map(key => {
    const value = reportCellValue(key, row);
    if (value == null || value === "") return null;
    if(['estadoPlazo','actividadPendiente'].includes(key))return reportText(key,value);
  if (key.toLowerCase().includes("fecha")) {
      const date = reportDate(value);
      if (!date) return null;
      const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      return new Date(`${calendar}T00:00:00Z`);
    }
    if ((["tasacion", "precioFinal", "comision", "rentaMensual", "rentaMensualSolicitada", "garantia", "adelanto"].includes(key) || key === "dias" || key === "posicion") && Number.isFinite(Number(value))) return Number(value);
    return Array.isArray(value) ? value.join(" · ") : value;
  })) });
  detail.getRow(1).height = 32;
  detail.getRow(1).eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: red } }; cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFF" } }; cell.alignment = { vertical: "middle", wrapText: true }; });
  report.columns.forEach((key, index) => {
    const column = detail.getColumn(index + 1);
  if (key.toLowerCase().includes("fecha")) column.numFmt = "dd/mm/yyyy";
    if (["precioFinal", "comision", "rentaMensual", "garantia", "adelanto"].includes(key)) column.numFmt = '"S/ "#,##0.00';
    if (key === "posicion") column.numFmt = "00";
  });
  detail.eachRow((row, index) => { if (index > 1) { row.height = Math.max(32, ...report.columns.map((key, columnIndex) => { const value = report.rows[index - 2] ? reportCellValue(key, report.rows[index - 2]) : null; const text = Array.isArray(value) ? value.join(" · ") : String(value ?? ""); return (Math.ceil(text.length / Math.max(10, (detail.getColumn(columnIndex + 1).width ?? 24) - 3)) + text.split("\n").length - 1) * 15 + 12; })); row.eachCell(cell => { cell.alignment = { vertical: "middle", wrapText: true }; cell.font = { name: "Calibri", size: 11 }; if (cell.value === "Activo" || cell.value === "Disponible") cell.font.color = { argb: "15803D" }; if (cell.value === "Histórico") cell.font.color = { argb: "64748B" }; }); } });
  for (const sheet of [summary, detail]) {
    sheet.pageSetup = { paperSize: 9, orientation: sheet === detail && report.columns.length > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: sheet === detail ? "1:1" : undefined };
    sheet.headerFooter.oddHeader = `&L${brand}&R${report.title.replaceAll("&", "&&")}`;
    sheet.headerFooter.oddFooter = "&LPágina &P de &N&RReporte de cartera";
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename(report, "xlsx"); anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
