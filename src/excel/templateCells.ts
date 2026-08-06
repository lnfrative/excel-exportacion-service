import type { FuenteAccionMejora } from "./types.js";

/** Única hoja que el generador toca. Ver Sheet1 (oculta, vestigial) — se preserva sin leer ni escribir. */
export const SHEET_XML_PATH = "xl/worksheets/sheet1.xml";

/** Sección 1 — Identificación general. Cada celda es el ancla de un merge (D3:H3, D4:H4, C7:C10, etc.). */
export const CAMPOS_GENERALES = {
  facultad: "D3",
  resultadoAprendizaje: "D4",
  codigoMateria: "C7",
  nombreMateria: "D7",
  nombreDocente: "E7",
  meta: "F7",
  periodo: "G7",
} as const;

/** Sección 2 — Criterios e instrumentos (filas 14-17, máximo duro de 4: fórmulas y validaciones lo asumen). */
export const CRITERIO_FILAS = [14, 15, 16, 17] as const;

export function criterioNombreCell(indice: number): string {
  return `C${CRITERIO_FILAS[indice]}`;
}
export function criterioInstrumentoCell(indice: number): string {
  return `E${CRITERIO_FILAS[indice]}`;
}
export function criterioDescripcionCell(indice: number): string {
  return `F${CRITERIO_FILAS[indice]}`;
}

/** Sección 3 — Tabulación de estudiantes (filas 28-78, 51 filas fijas). Columna B (autonumeración) nunca se escribe. */
export const ESTUDIANTE_FILA_INICIO = 28;
export const ESTUDIANTE_FILA_FIN = 78;
export const CRITERIO_COLUMNAS = ["E", "F", "G", "H"] as const;

export function estudianteNombreCell(indiceFila: number): string {
  return `C${ESTUDIANTE_FILA_INICIO + indiceFila}`;
}
export function estudianteCalificacionCell(indiceFila: number, indiceCriterio: number): string {
  return `${CRITERIO_COLUMNAS[indiceCriterio]}${ESTUDIANTE_FILA_INICIO + indiceFila}`;
}

/** Sección 6 — Acciones de mejora. Filas fijas por fuente; G es una sola celda de texto libre "fecha inicio - fecha fin". */
export const ACCION_MEJORA_FILAS: Record<FuenteAccionMejora, number> = {
  curso: 129,
  programa: 130,
  instrumento: 131,
};

export const ACCION_MEJORA_COLUMNAS = {
  factorMejora: "D",
  accionPropuesta: "E",
  responsable: "F",
  fechaInicioFin: "G",
  observaciones: "H",
} as const;

export function accionMejoraCell(
  fuente: FuenteAccionMejora,
  campo: keyof typeof ACCION_MEJORA_COLUMNAS
): string {
  return `${ACCION_MEJORA_COLUMNAS[campo]}${ACCION_MEJORA_FILAS[fuente]}`;
}
