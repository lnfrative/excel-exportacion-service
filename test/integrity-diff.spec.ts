import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";

import { buildWorkbook } from "../src/excel/buildWorkbook.js";
import { SHEET_XML_PATH } from "../src/excel/templateCells.js";
import type { ReporteMedicionPayload } from "../src/excel/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../templates/formato_excel_exportacion.xlsx");
const TEMPLATE_BUFFER = readFileSync(TEMPLATE_PATH);

function loadFixture(name: string): ReporteMedicionPayload {
  const raw = readFileSync(path.resolve(__dirname, "fixtures", name), "utf8");
  return JSON.parse(raw) as ReporteMedicionPayload;
}

function extractElementXml(doc: Document, tagName: string): string | null {
  const el = doc.getElementsByTagName(tagName).item(0);
  return el ? new XMLSerializer().serializeToString(el) : null;
}

function rowRefs(doc: Document): string[] {
  const rows = doc.getElementsByTagName("row");
  const refs: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    refs.push(rows.item(i)!.getAttribute("r")!);
  }
  return refs;
}

describe("integridad del archivo generado frente a la plantilla original", () => {
  let origEntries: Record<string, Buffer>;
  let genEntries: Record<string, Buffer>;

  beforeAll(async () => {
    const payload = loadFixture("payload-completo.json");
    const outputBuffer = await buildWorkbook(payload, TEMPLATE_BUFFER);

    const origZip = await JSZip.loadAsync(TEMPLATE_BUFFER);
    const genZip = await JSZip.loadAsync(outputBuffer);

    origEntries = {};
    for (const [name, file] of Object.entries(origZip.files)) {
      if (!file.dir) origEntries[name] = await file.async("nodebuffer");
    }
    genEntries = {};
    for (const [name, file] of Object.entries(genZip.files)) {
      if (!file.dir) genEntries[name] = await file.async("nodebuffer");
    }
  });

  it("no agrega ni elimina entradas del zip", () => {
    expect(Object.keys(genEntries).sort()).toEqual(Object.keys(origEntries).sort());
  });

  it("deja byte-idénticas todas las entradas salvo sheet1.xml", () => {
    for (const name of Object.keys(origEntries)) {
      if (name === SHEET_XML_PATH) continue;
      expect(genEntries[name].equals(origEntries[name]), `${name} debería ser idéntico`).toBe(
        true
      );
    }
  });

  it("preserva merges, validaciones de datos, formato condicional y anchos de columna en sheet1.xml", () => {
    const origDoc = new DOMParser().parseFromString(
      origEntries[SHEET_XML_PATH].toString("utf8"),
      "text/xml"
    );
    const genDoc = new DOMParser().parseFromString(
      genEntries[SHEET_XML_PATH].toString("utf8"),
      "text/xml"
    );

    for (const tag of ["mergeCells", "dataValidations", "conditionalFormatting", "cols", "sheetFormatPr"]) {
      expect(extractElementXml(genDoc, tag), `<${tag}> debería ser idéntico`).toBe(
        extractElementXml(origDoc, tag)
      );
    }
  });

  it("no inserta ni elimina filas (mismas referencias de <row>)", () => {
    const origDoc = new DOMParser().parseFromString(
      origEntries[SHEET_XML_PATH].toString("utf8"),
      "text/xml"
    );
    const genDoc = new DOMParser().parseFromString(
      genEntries[SHEET_XML_PATH].toString("utf8"),
      "text/xml"
    );
    expect(rowRefs(genDoc)).toEqual(rowRefs(origDoc));
  });
});
