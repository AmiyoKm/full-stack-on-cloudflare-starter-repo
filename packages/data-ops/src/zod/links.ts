import { z } from "zod";

export const destinationsSchema = z.preprocess(
  (obj) => {
    if (typeof obj === "string") {
      console.log(obj);
      return JSON.parse(obj);
    }
    return obj;
  },
  z
    .object({
      default: z.string().url(),
    })
    .catchall(z.string().url()),
);

export type DestinationsSchemaType = z.infer<typeof destinationsSchema>;

export const linkSchema = z.object({
  linkId: z.string(),
  accountId: z.string(),
  name: z.string().min(1).max(100),
  destinations: destinationsSchema,
  created: z.string(),
  updated: z.string(),
});
export const createLinkSchema = linkSchema.omit({
  created: true,
  updated: true,
  accountId: true,
  linkId: true,
});

export const cloudflareInfoSchema = z.object({
  country: z.string().optional(),
  latitude: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
  longitude: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
});

export const durableObjectGeoClickSchama = z.object({
  latitude: z.number(),
  longitude: z.number(),
  time: z.number(),
  country: z.string(),
});

export const durableObjectGeoClickArraySchema = z.array(
  durableObjectGeoClickSchama,
);

export type DurableObjectGeoClickSchemaType = z.infer<
  typeof durableObjectGeoClickSchama
>;

export type CloudflareInfoSchemaType = z.infer<typeof cloudflareInfoSchema>;

export type LinkSchemaType = z.infer<typeof linkSchema>;
export type CreateLinkSchemaType = z.infer<typeof createLinkSchema>;

// Input schemas for tRPC procedures
export const linkListInputSchema = z.object({
  offset: z.number().optional(),
});

export const linkIdSchema = z.object({
  linkId: z.string(),
});

export const updateLinkNameInputSchema = z.object({
  linkId: z.string(),
  name: z.string().min(1).max(300),
});

export const updateLinkDestinationsInputSchema = z.object({
  linkId: z.string(),
  destinations: destinationsSchema,
});

export const last24HourClicksSchema = z.object({
  last24Hours: z.number(),
  previous24Hours: z.number(),
  percentChange: z.number(),
});

export type LinkListInputSchemaType = z.infer<typeof linkListInputSchema>;
export type LinkIdSchemaType = z.infer<typeof linkIdSchema>;
export type UpdateLinkNameInputSchemaType = z.infer<typeof updateLinkNameInputSchema>;
export type UpdateLinkDestinationsInputSchemaType = z.infer<typeof updateLinkDestinationsInputSchema>;
export type Last24HourClicksSchemaType = z.infer<typeof last24HourClicksSchema>;
