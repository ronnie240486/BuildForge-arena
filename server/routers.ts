import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buildforgeRouter } from "./routers/buildforge";
import { z } from "zod";
import { loginClient, logoutClient, registerClient } from "./client-auth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) })).mutation(async ({ input, ctx }) => ({ user: await registerClient({ ...input, res: ctx.res }) })),
    login: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(128) })).mutation(async ({ input, ctx }) => ({ user: await loginClient({ ...input, res: ctx.res }) })),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      await logoutClient(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),
  buildforge: buildforgeRouter,
});

export type AppRouter = typeof appRouter;
