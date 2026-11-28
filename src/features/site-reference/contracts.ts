import { z } from "zod";
export const pointSchema = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) });
export const searchPlaceSchema = z.object({ query: z.string().trim().min(2).max(160), countryCode: z.string().regex(/^([A-Za-z]{2})?$/).default(""), external: z.boolean().default(false) }).strict();
export const dossierInput = pointSchema.extend({ key: z.string().max(100), geocodingRequestId: z.string().uuid().nullable(), name: z.string().trim().min(2).max(160), coordinatesConfirmed: z.literal(true), correctionNote: z.string().trim().min(3).max(1000), nasaYear: z.number().int().min(2001).max(2100).nullable() }).strict();
