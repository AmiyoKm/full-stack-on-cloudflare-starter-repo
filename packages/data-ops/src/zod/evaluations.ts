import { z } from "zod";

export const recentEvaluationsInputSchema = z
  .object({
    createdBefore: z.string().optional(),
  })
  .optional();

export type RecentEvaluationsInputSchemaType = z.infer<typeof recentEvaluationsInputSchema>;
