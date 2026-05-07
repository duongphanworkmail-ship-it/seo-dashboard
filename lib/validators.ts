import { z } from "zod"

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

export const propertyQuerySchema = dateRangeSchema.extend({
  propertyId: z.string().cuid(),
  device: z.enum(["ALL", "DESKTOP", "MOBILE", "TABLET"]).optional().default("ALL"),
  country: z.string().length(3).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(25),
  groupBy: z.string().optional(),
  searchQuery: z.string().max(200).optional(),
  searchDimension: z.string().max(100).optional(),
  filterDimension: z.string().max(100).optional(),
  filterValue: z.string().max(500).optional(),
})

export const createPropertySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["GSC", "GA4"]),
  externalId: z.string().min(1).max(200),
})

export const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

export const grantPermissionSchema = z.object({
  userId: z.string().cuid(),
  propertyId: z.string().cuid(),
})
