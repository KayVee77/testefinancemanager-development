import { z } from 'zod';

/**
 * Schema for category validation
 */
export const CategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Kategorijos pavadinimas yra privalomas')
    .max(50, 'Kategorijos pavadinimas per ilgas')
    .trim(),
  
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Neteisinga spalvos reikšmė (pvz., #FF5733)')
    .default('#3B82F6'),
  
  icon: z
    .string()
    .min(1, 'Ikonos pavadinimas yra privalomas')
    .max(50, 'Ikonos pavadinimas per ilgas')
    .default('circle'),
  
  type: z.enum(['income', 'expense'])
});

/**
 * Type inference for category validation
 */
export type CategoryInput = z.infer<typeof CategorySchema>;
