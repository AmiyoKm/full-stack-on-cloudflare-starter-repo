import { t } from "@/worker/trpc/trpc-instance";

import {
  getEvaluations,
  getNotAvailableEvaluations,
} from "@repo/data-ops/queries/evaluations";
import { recentEvaluationsInputSchema } from "@repo/data-ops/zod-schema/evaluations";

export const evaluationsTrpcRoutes = t.router({
  problematicDestinations: t.procedure.query(async ({ ctx }) => {
    return getNotAvailableEvaluations(ctx.userInfo.userId);
  }),
  recentEvaluations: t.procedure
    .input(recentEvaluationsInputSchema)
    .query(async ({ ctx }) => {
      const evaluations = await getEvaluations(ctx.userInfo.userId);

      const oldestCreatedAt =
        evaluations.length > 0
          ? evaluations[evaluations.length - 1].createdAt
          : null;

      return {
        data: evaluations,
        oldestCreatedAt,
      };
    }),
});
