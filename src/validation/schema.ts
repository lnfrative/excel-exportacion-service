import {
  MAX_CRITERIOS,
  MAX_ESTUDIANTES,
  NIVELES_LOGRO,
  PERIODOS,
  type ReporteMedicionPayload,
} from "../excel/types.js";

const accionMejoraSchema = {
  type: "object",
  additionalProperties: false,
  required: ["factorMejora", "accionPropuesta", "responsable", "fechaInicioFin", "observaciones"],
  properties: {
    factorMejora: { type: "string" },
    accionPropuesta: { type: "string" },
    responsable: { type: "string" },
    fechaInicioFin: { type: "string" },
    observaciones: { type: "string" },
  },
};

export const reporteMedicionBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "facultad",
    "resultadoAprendizaje",
    "codigoMateria",
    "nombreMateria",
    "nombreDocente",
    "meta",
    "periodo",
    "criterios",
    "estudiantes",
  ],
  properties: {
    facultad: { type: "string", minLength: 1 },
    resultadoAprendizaje: { type: "string", minLength: 1 },
    codigoMateria: { type: "string", minLength: 1 },
    nombreMateria: { type: "string", minLength: 1 },
    nombreDocente: { type: "string", minLength: 1 },
    meta: { type: "number", minimum: 0, maximum: 1 },
    periodo: { type: "string", enum: PERIODOS },
    criterios: {
      type: "array",
      minItems: 1,
      maxItems: MAX_CRITERIOS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "tipoInstrumento", "descripcionInstrumento"],
        properties: {
          nombre: { type: "string", minLength: 1 },
          tipoInstrumento: { type: "string", minLength: 1 },
          descripcionInstrumento: { type: "string" },
        },
      },
    },
    estudiantes: {
      type: "array",
      minItems: 0,
      maxItems: MAX_ESTUDIANTES,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "calificaciones"],
        properties: {
          nombre: { type: "string", minLength: 1 },
          calificaciones: {
            type: "array",
            items: { type: "string", enum: NIVELES_LOGRO },
          },
        },
      },
    },
    accionesMejora: {
      type: "object",
      additionalProperties: false,
      properties: {
        curso: accionMejoraSchema,
        programa: accionMejoraSchema,
        instrumento: accionMejoraSchema,
      },
    },
  },
};

/**
 * Restricciones que el JSON Schema no puede expresar razonablemente: cada estudiante debe
 * calificar exactamente los mismos criterios que se definieron (mismo largo y orden implícito).
 */
export function validatePayloadConsistency(payload: ReporteMedicionPayload): string[] {
  const errores: string[] = [];
  payload.estudiantes.forEach((estudiante, i) => {
    if (estudiante.calificaciones.length !== payload.criterios.length) {
      errores.push(
        `estudiantes[${i}].calificaciones debe tener ${payload.criterios.length} elementos ` +
          `(uno por criterio), tiene ${estudiante.calificaciones.length}`
      );
    }
  });
  return errores;
}
