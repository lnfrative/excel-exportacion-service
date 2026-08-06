import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildWorkbook } from "../src/excel/buildWorkbook.js";
import type { ReporteMedicionPayload } from "../src/excel/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../templates/formato_excel_exportacion.xlsx");
const TEMPLATE_BUFFER = readFileSync(TEMPLATE_PATH);

function loadFixture(name: string): ReporteMedicionPayload {
  const raw = readFileSync(path.resolve(__dirname, "fixtures", name), "utf8");
  return JSON.parse(raw) as ReporteMedicionPayload;
}

async function generateAndReload(payload: ReporteMedicionPayload) {
  const buffer = await buildWorkbook(payload, TEMPLATE_BUFFER);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Reporte de medición");
  if (!sheet) throw new Error('Hoja "Reporte de medición" no encontrada en el output');
  return sheet;
}

describe("buildWorkbook — payload completo", () => {
  const payload = loadFixture("payload-completo.json");

  it("escribe los campos generales en las celdas correctas", async () => {
    const sheet = await generateAndReload(payload);
    expect(sheet.getCell("D3").value).toBe(payload.facultad);
    expect(sheet.getCell("D4").value).toBe(payload.resultadoAprendizaje);
    expect(sheet.getCell("C7").value).toBe(payload.codigoMateria);
    expect(sheet.getCell("D7").value).toBe(payload.nombreMateria);
    expect(sheet.getCell("E7").value).toBe(payload.nombreDocente);
    expect(sheet.getCell("F7").value).toBe(payload.meta);
    expect(sheet.getCell("G7").value).toBe(payload.periodo);
  });

  it("escribe los 3 criterios provistos y deja vacía la 4ta posición", async () => {
    const sheet = await generateAndReload(payload);
    for (let i = 0; i < payload.criterios.length; i++) {
      const fila = 14 + i;
      expect(sheet.getCell(`C${fila}`).value).toBe(payload.criterios[i].nombre);
      expect(sheet.getCell(`E${fila}`).value).toBe(payload.criterios[i].tipoInstrumento);
      expect(sheet.getCell(`F${fila}`).value).toBe(payload.criterios[i].descripcionInstrumento);
    }
    expect(sheet.getCell("C17").value).toBeNull();
    expect(sheet.getCell("E17").value).toBeNull();
    expect(sheet.getCell("F17").value).toBeNull();
  });

  it("escribe estudiantes con nivel de logro mapeado U->I y deja el resto de filas vacías", async () => {
    const sheet = await generateAndReload(payload);
    const columnas = ["E", "F", "G", "H"];
    payload.estudiantes.forEach((estudiante, i) => {
      const fila = 28 + i;
      expect(sheet.getCell(`C${fila}`).value).toBe(estudiante.nombre);
      estudiante.calificaciones.forEach((nivel, c) => {
        const esperado = nivel === "U" ? "I" : nivel;
        expect(sheet.getCell(`${columnas[c]}${fila}`).value).toBe(esperado);
      });
    });
    const filaVacia = 28 + payload.estudiantes.length;
    expect(sheet.getCell(`C${filaVacia}`).value).toBeNull();
    expect(sheet.getCell("C78").value).toBeNull();
  });

  it("mantiene intactas las fórmulas de autonumeración, % cumplimiento y logro global", async () => {
    const sheet = await generateAndReload(payload);
    expect(sheet.getCell("B28").formula).toBe('IF(C28<>"",COUNTA($C$28:C28),"")');
    expect(sheet.getCell("H82").formula).toContain("Logrado");
    expect(sheet.getCell("D88").formula).toContain("OR(H83=");
  });

  it("escribe las 3 filas de acciones de mejora en las celdas correctas", async () => {
    const sheet = await generateAndReload(payload);
    const filas = { curso: 129, programa: 130, instrumento: 131 } as const;
    for (const [fuente, fila] of Object.entries(filas)) {
      const accion = payload.accionesMejora?.[fuente as keyof typeof filas];
      expect(sheet.getCell(`D${fila}`).value).toBe(accion?.factorMejora || null);
      expect(sheet.getCell(`E${fila}`).value).toBe(accion?.accionPropuesta || null);
      expect(sheet.getCell(`F${fila}`).value).toBe(accion?.responsable || null);
      expect(sheet.getCell(`G${fila}`).value).toBe(accion?.fechaInicioFin || null);
    }
  });
});

describe("buildWorkbook — payload mínimo (1 criterio, 0 estudiantes, sin acciones de mejora)", () => {
  const payload = loadFixture("payload-minimo.json");

  it("deja vacías las secciones no provistas sin lanzar errores", async () => {
    const sheet = await generateAndReload(payload);
    expect(sheet.getCell("C14").value).toBe(payload.criterios[0].nombre);
    expect(sheet.getCell("C15").value).toBeNull();
    expect(sheet.getCell("C28").value).toBeNull();
    expect(sheet.getCell("D129").value).toBeNull();
    expect(sheet.getCell("D130").value).toBeNull();
    expect(sheet.getCell("D131").value).toBeNull();
  });
});
