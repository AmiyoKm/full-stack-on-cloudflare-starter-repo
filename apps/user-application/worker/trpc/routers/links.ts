import { t } from "@/worker/trpc/trpc-instance";
import {
  createLinkSchema,
  linkIdSchema,
  linkListInputSchema,
  updateLinkDestinationsInputSchema,
  updateLinkNameInputSchema,
} from "@repo/data-ops/zod-schema/links";

import {
  createLink,
  getLink,
  getLinks,
  updateLinkDestinations,
  updateLinkName,
} from "@repo/data-ops/queries/links";

import { TRPCError } from "@trpc/server";
import { ACTIVE_LINKS_LAST_HOUR, LAST_30_DAYS_BY_COUNTRY } from "./dummy-data";

export const linksTrpcRoutes = t.router({
  linkList: t.procedure
    .input(linkListInputSchema)
    .query(async ({ ctx, input }) => {
      return getLinks(ctx.userInfo.userId, input.offset?.toString());
    }),
  createLink: t.procedure
    .input(createLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const linkId = await createLink({
        accountId: ctx.userInfo.userId,
        name: input.name,
        destinations: input.destinations,
      });
      return linkId;
    }),
  updateLinkName: t.procedure
    .input(updateLinkNameInputSchema)
    .mutation(async ({ input }) => {
      await updateLinkName(input.linkId, input.name);
    }),
  getLink: t.procedure.input(linkIdSchema).query(async ({ input }) => {
    const data = await getLink(input.linkId);
    if (!data) throw new TRPCError({ code: "NOT_FOUND" });
    return data;
  }),
  updateLinkDestinations: t.procedure
    .input(updateLinkDestinationsInputSchema)
    .mutation(async ({ input }) => {
      await updateLinkDestinations(input.linkId, input.destinations);
    }),
  activeLinks: t.procedure.query(async () => {
    return ACTIVE_LINKS_LAST_HOUR;
  }),
  totalLinkClickLastHour: t.procedure.query(async () => {
    return 13;
  }),
  last24HourClicks: t.procedure.query(async () => {
    return {
      last24Hours: 56,
      previous24Hours: 532,
      percentChange: 12,
    };
  }),
  last30DaysClicks: t.procedure.query(async () => {
    return 78;
  }),
  clicksByCountry: t.procedure.query(async () => {
    return LAST_30_DAYS_BY_COUNTRY;
  }),
});
