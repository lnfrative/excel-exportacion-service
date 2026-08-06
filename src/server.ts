import Fastify from "fastify";

import { apiKeyAuth } from "./plugins/apiKeyAuth.js";
import { healthRoutes } from "./routes/health.js";
import { reporteMedicionRoutes } from "./routes/reporteMedicion.js";

const PORT = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(healthRoutes);

  await app.register(
    async (api) => {
      await api.register(apiKeyAuth);
      await api.register(reporteMedicionRoutes);
    },
    { prefix: "/api" }
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
