import { z } from 'zod';

/**
 * Schema for transaction validation with comprehensive rules
 */
export const TransactionSchema = z.object({
  amount: z
    .number()
    .positive('Suma turi būti teigiama')
    .max(1000000, 'Suma negali viršyti 1,000,000€')
    .multipleOf(0.01, 'Suma gali turėti tik 2 skaitmenis po kablelio'),
  
  description: z
    .string()
    .min(1, 'Aprašymas yra privalomas')
    .max(500, 'Aprašymas negali būti ilgesnis nei 500 simbolių')
    .trim(),
  
  category: z
    .string()
    .min(1, 'Kategorija yra privaloma')
    .max(100, 'Kategorijos pavadinimas per ilgas'),
  
  type: z.enum(['income', 'expense']),
  
  date: z
    .date()
    .max(new Date(), 'Data negali būti ateityje')
});

/**
 * Schema for transaction form input (before date conversion)
 */
export const TransactionFormSchema = z.object({
  amount: z
    .string()
    .min(1, 'Suma yra privaloma')
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .positive('Suma turi būti teigiama')
        .max(1000000, 'Suma negali viršyti 1,000,000€')
    ),
  
  description: z
    .string()
    .min(1, 'Aprašymas yra privalomas')
    .max(500, 'Aprašymas negali būti ilgesnis nei 500 simbolių')
    .trim(),
  
  category: z
    .string()
    .min(1, 'Kategorija yra privaloma'),
  
  type: z.enum(['income', 'expense']),
  
  date: z.string().min(1, 'Data yra privaloma')
});

/**
 * Type inference for transaction validation
 */
export type TransactionFormInput = z.infer<typeof TransactionFormSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
