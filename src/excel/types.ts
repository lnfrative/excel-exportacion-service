export const NIVELES_LOGRO = ["U", "D", "S", "E"] as const;
export type NivelLogro = (typeof NIVELES_LOGRO)[number];

/**
 * El dominio (T_RML_CALIFICACIONCRITERIO.NIVELLOGRO) usa U/D/S/E,
 * pero la plantilla Excel valida contra I/D/S/E (U -> Insatisfactorio -> "I").
 */
export const NIVEL_LOGRO_MAP: Record<NivelLogro, "I" | "D" | "S" | "E"> = {
  U: "I",
  D: "D",
  S: "S",
  E: "E",
};

export const PERIODOS = ["PAO-0", "PAO-1", "PAO-2"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const FUENTES_ACCION_MEJORA = ["curso", "programa", "instrumento"] as const;
export type FuenteAccionMejora = (typeof FUENTES_ACCION_MEJORA)[number];

export const MAX_CRITERIOS = 4;
export const MAX_ESTUDIANTES = 51;

export interface CriterioPayload {
  nombre: string;
  tipoInstrumento: string;
  descripcionInstrumento: string;
}

export interface EstudiantePayload {
  nombre: string;
  /** Mismo largo que `criterios`, en el mismo orden. */
  calificaciones: NivelLogro[];
}

export interface AccionMejora {
  factorMejora: string;
  accionPropuesta: string;
  responsable: string;
  /** Rango ya formateado, ej. "01/03/2026 - 30/06/2026" (una sola celda en la plantilla). */
  fechaInicioFin: string;
  observaciones: string;
}

export type AccionesMejoraPayload = Partial<Record<FuenteAccionMejora, AccionMejora>>;

export interface ReporteMedicionPayload {
  facultad: string;
  resultadoAprendizaje: string;
  codigoMateria: string;
  nombreMateria: string;
  nombreDocente: string;
  /** Decimal 0-1 (ej. 0.75 = 75%), la celda ya tiene formato de porcentaje. */
  meta: number;
  periodo: Periodo;
  criterios: CriterioPayload[];
  estudiantes: EstudiantePayload[];
  accionesMejora?: AccionesMejoraPayload;
}
