import { getAuth } from "@repo/data-ops/auth";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createContext } from "../trpc/context";
import { appRouter } from "../trpc/router";

export const app = new Hono<{
  Bindings: ServiceBindings;
  Variables: { userId: string };
}>();

const getAuthInstance = (env: Env) => {
  return getAuth({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });
};

const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuthInstance(c.env);
  const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!sessionData || !sessionData.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", sessionData.user.id);
  await next();
});

app.all("/trpc/*", authMiddleware, async (c) => {
  const userId = c.get("userId");
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () =>
      createContext({
        req: c.req.raw,
        env: c.env,
        workerCtx: c.executionCtx,
        userId,
      }),
  });
});

app.get("/click-socket", authMiddleware, async (c) => {
  const headers = new Headers(c.req.raw.headers);
  const userId = c.get("userId");
  headers.set("account-id", userId);

  const proxiedRequest = new Request(c.req.raw, { headers });
  return c.env.BACKEND_SERVICE.fetch(proxiedRequest);
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = getAuthInstance(c.env);
  return auth.handler(c.req.raw);
});
