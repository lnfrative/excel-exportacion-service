import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Document, Element } from "@xmldom/xmldom";
import JSZip from "jszip";

import {
  ACCION_MEJORA_COLUMNAS,
  CAMPOS_GENERALES,
  CRITERIO_COLUMNAS,
  CRITERIO_FILAS,
  ESTUDIANTE_FILA_FIN,
  ESTUDIANTE_FILA_INICIO,
  SHEET_XML_PATH,
  accionMejoraCell,
  criterioDescripcionCell,
  criterioInstrumentoCell,
  criterioNombreCell,
  estudianteCalificacionCell,
  estudianteNombreCell,
} from "./templateCells.js";
import { FUENTES_ACCION_MEJORA, NIVEL_LOGRO_MAP, type ReporteMedicionPayload } from "./types.js";

type CellIndex = Map<string, Element>;

function buildCellIndex(doc: Document): CellIndex {
  const index: CellIndex = new Map();
  const cells = doc.getElementsByTagName("c");
  for (let i = 0; i < cells.length; i++) {
    const cell = cells.item(i);
    const ref = cell?.getAttribute("r");
    if (cell && ref) index.set(ref, cell);
  }
  return index;
}

function getCell(index: CellIndex, ref: string): Element {
  const cell = index.get(ref);
  if (!cell) {
    throw new Error(`Celda ${ref} no encontrada en xl/worksheets/sheet1.xml de la plantilla`);
  }
  return cell;
}

function clearCellContent(doc: Document, cell: Element): void {
  while (cell.firstChild) {
    cell.removeChild(cell.firstChild);
  }
  if (cell.hasAttribute("t")) {
    cell.removeAttribute("t");
  }
}

/**
 * Escribe texto como inlineStr, sin tocar sharedStrings.xml. Si `value` es
 * undefined/cadena vacía, deja la celda vacía (limpia dummy data de la plantilla).
 */
function writeText(doc: Document, index: CellIndex, ref: string, value: string | undefined): void {
  const cell = getCell(index, ref);
  clearCellContent(doc, cell);
  if (!value) return;

  cell.setAttribute("t", "inlineStr");
  const is = doc.createElement("is");
  const t = doc.createElement("t");
  if (/^\s|\s$/.test(value)) {
    t.setAttribute("xml:space", "preserve");
  }
  t.appendChild(doc.createTextNode(value));
  is.appendChild(t);
  cell.appendChild(is);
}

/** Escribe un número puro (celda `meta`), preservando el formato `0%` ya definido por su `s=`. */
function writeNumber(doc: Document, index: CellIndex, ref: string, value: number): void {
  const cell = getCell(index, ref);
  clearCellContent(doc, cell);
  const v = doc.createElement("v");
  v.appendChild(doc.createTextNode(String(value)));
  cell.appendChild(v);
}

export async function buildWorkbook(
  payload: ReporteMedicionPayload,
  templateBuffer: Buffer
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const sheetFile = zip.file(SHEET_XML_PATH);
  if (!sheetFile) {
    throw new Error(`No se encontró ${SHEET_XML_PATH} dentro de la plantilla`);
  }
  const sheetXml = await sheetFile.async("string");

  const doc = new DOMParser().parseFromString(sheetXml, "text/xml");
  const index = buildCellIndex(doc);

  // Sección 1: identificación general
  writeText(doc, index, CAMPOS_GENERALES.facultad, payload.facultad);
  writeText(doc, index, CAMPOS_GENERALES.resultadoAprendizaje, payload.resultadoAprendizaje);
  writeText(doc, index, CAMPOS_GENERALES.codigoMateria, payload.codigoMateria);
  writeText(doc, index, CAMPOS_GENERALES.nombreMateria, payload.nombreMateria);
  writeText(doc, index, CAMPOS_GENERALES.nombreDocente, payload.nombreDocente);
  writeNumber(doc, index, CAMPOS_GENERALES.meta, payload.meta);
  writeText(doc, index, CAMPOS_GENERALES.periodo, payload.periodo);

  // Sección 2: criterios — siempre se recorren las 4 posiciones fijas de la plantilla,
  // las que sobren respecto al payload quedan vacías (limpia "Describa criterio N" de ejemplo).
  for (let i = 0; i < CRITERIO_FILAS.length; i++) {
    const criterio = payload.criterios[i];
    writeText(doc, index, criterioNombreCell(i), criterio?.nombre);
    writeText(doc, index, criterioInstrumentoCell(i), criterio?.tipoInstrumento);
    writeText(doc, index, criterioDescripcionCell(i), criterio?.descripcionInstrumento);
  }

  // Sección 3: estudiantes — mismo criterio, siempre las 51 filas fijas de la plantilla.
  const totalFilas = ESTUDIANTE_FILA_FIN - ESTUDIANTE_FILA_INICIO + 1;
  for (let fila = 0; fila < totalFilas; fila++) {
    const estudiante = payload.estudiantes[fila];
    writeText(doc, index, estudianteNombreCell(fila), estudiante?.nombre);
    for (let c = 0; c < CRITERIO_COLUMNAS.length; c++) {
      const nivel = estudiante?.calificaciones[c];
      const valorPlantilla = nivel ? NIVEL_LOGRO_MAP[nivel] : undefined;
      writeText(doc, index, estudianteCalificacionCell(fila, c), valorPlantilla);
    }
  }

  // Sección 6: acciones de mejora (3 filas fijas por fuente)
  for (const fuente of FUENTES_ACCION_MEJORA) {
    const accion = payload.accionesMejora?.[fuente];
    for (const campo of Object.keys(ACCION_MEJORA_COLUMNAS) as Array<
      keyof typeof ACCION_MEJORA_COLUMNAS
    >) {
      writeText(doc, index, accionMejoraCell(fuente, campo), accion?.[campo]);
    }
  }

  const nuevoXml = new XMLSerializer().serializeToString(doc);
  // createFolders: false — el template original no tiene entradas de directorio en el zip;
  // sin esta opción JSZip inserta "xl/" y "xl/worksheets/" como entradas nuevas al sobreescribir.
  zip.file(SHEET_XML_PATH, nuevoXml, { createFolders: false });

  // JSZip no conserva el método de compresión original por entrada al cargar un zip (todas
  // quedan con compression=null), así que sin fijarlo aquí el output completo se regenera en
  // STORE (varias veces más pesado). El contenido byte-a-byte de las entradas no tocadas no
  // cambia — esto solo afecta cómo se empaqueta el zip, no lo que Excel renderiza.
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}
