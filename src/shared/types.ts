import z from "zod";

// User profile roles
export const UserRole = z.enum(['admin', 'company', 'affiliate', 'cashier']);
export type UserRoleType = z.infer<typeof UserRole>;

// User profile schema
export const UserProfileSchema = z.object({
  id: z.number(),
  mocha_user_id: z.string(),
  cpf: z.string().nullable(),
  role: UserRole,
  is_active: z.boolean(),
  sponsor_id: z.number().nullable(),
  company_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Combined user data (Mocha user + profile)
export const CashMaisUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  google_sub: z.string(),
  profile: UserProfileSchema.nullable(),
});

export type CashMaisUser = z.infer<typeof CashMaisUserSchema>;
