import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * Protege todas las rutas registradas en el mismo contexto (ver server.ts, aplicado solo
 * bajo el prefijo /api). Valida el header X-Api-Key contra process.env.API_KEY.
 *
 * Envuelto con fastify-plugin: sin esto, el addHook quedaría encapsulado dentro de este
 * plugin y NO se aplicaría a reporteMedicionRoutes, que se registra como plugin hermano
 * bajo el mismo prefijo — el hook nunca se ejecutaría para esas rutas.
 */
export const apiKeyAuth: FastifyPluginAsync = fp(async (fastify) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY no está configurada (ver .env.example)");
  }

  fastify.addHook("onRequest", async (request, reply) => {
    const provided = request.headers["x-api-key"];
    if (provided !== apiKey) {
      await reply.code(401).send({ error: "API key inválida o ausente" });
    }
  });
});
