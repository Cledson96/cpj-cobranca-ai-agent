import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export type AdminAuthOptions = {
  token: string;
};

async function adminAuthPlugin(app: FastifyInstance, options: AdminAuthOptions): Promise<void> {
  app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers["x-admin-token"];
    if (token !== options.token) {
      return reply.status(401).send({ error: "unauthorized" });
    }
  });
}

export const registerAdminAuth = fp(adminAuthPlugin, {
  name: "admin-auth",
});
