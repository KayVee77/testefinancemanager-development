import { z } from 'zod';

/**
 * Schema for authentication (login and registration)
 */
export const AuthSchema = z.object({
  email: z
    .string()
    .email('Neteisingas el. pašto formatas')
    .max(255, 'El. paštas per ilgas')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(8, 'Slaptažodis turi būti bent 8 simbolių')
    .max(128, 'Slaptažodis per ilgas')
    .regex(/[A-Z]/, 'Slaptažodis turi turėti bent vieną didžiąją raidę')
    .regex(/[a-z]/, 'Slaptažodis turi turėti bent vieną mažąją raidę')
    .regex(/[0-9]/, 'Slaptažodis turi turėti bent vieną skaičių'),
  
  name: z
    .string()
    .min(2, 'Vardas per trumpas')
    .max(100, 'Vardas per ilgas')
    .trim()
    .optional()
});

/**
 * Schema for login (email + password only)
 */
export const LoginSchema = AuthSchema.pick({ email: true, password: true });

/**
 * Schema for registration (email + password + name required)
 */
export const RegisterSchema = AuthSchema.required();

/**
 * Relaxed password schema for current implementation (minimum 6 characters)
 * This matches the current validatePassword function
 * TODO: Migrate to stricter AuthSchema requirements in production
 */
export const RelaxedAuthSchema = z.object({
  email: z
    .string()
    .email('Neteisingas el. pašto formatas')
    .max(255, 'El. paštas per ilgas')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(6, 'Slaptažodis turi būti bent 6 simbolių ilgio')
    .max(128, 'Slaptažodis per ilgas'),
  
  name: z
    .string()
    .min(2, 'Vardas per trumpas')
    .max(100, 'Vardas per ilgas')
    .trim()
    .optional()
});

export const RelaxedLoginSchema = RelaxedAuthSchema.pick({ email: true, password: true });
export const RelaxedRegisterSchema = RelaxedAuthSchema.required();

/**
 * Type inference for auth validation
 */
export type AuthInput = z.infer<typeof AuthSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type RelaxedAuthInput = z.infer<typeof RelaxedAuthSchema>;
