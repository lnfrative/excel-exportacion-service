import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyPluginAsync } from "fastify";

import { buildWorkbook } from "../excel/buildWorkbook.js";
import type { ReporteMedicionPayload } from "../excel/types.js";
import { reporteMedicionBodySchema, validatePayloadConsistency } from "../validation/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../../templates/formato_excel_exportacion.xlsx");

let templateBufferPromise: Promise<Buffer> | undefined;
function getTemplateBuffer(): Promise<Buffer> {
  templateBufferPromise ??= readFile(TEMPLATE_PATH);
  return templateBufferPromise;
}

export const reporteMedicionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: ReporteMedicionPayload }>(
    "/reportes/medicion/excel",
    { schema: { body: reporteMedicionBodySchema } },
    async (request, reply) => {
      const payload = request.body;

      const errores = validatePayloadConsistency(payload);
      if (errores.length > 0) {
        return reply.code(400).send({ error: "Payload inconsistente", detalles: errores });
      }

      const template = await getTemplateBuffer();
      const buffer = await buildWorkbook(payload, template);

      return reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        .header("Content-Disposition", 'attachment; filename="reporte-medicion.xlsx"')
        .send(buffer);
    }
  );
};
