import { z } from 'zod';

/**
 * Zod schema for CarbonInput — mirrors the backend Pydantic CarbonInput model exactly.
 * Used for client-side validation before sending data to the API.
 */
export const carbonInputSchema = z.object({
  transport_km_car_petrol: z.number().min(0).max(100_000),
  transport_km_car_diesel: z.number().min(0).max(100_000),
  transport_km_car_electric: z.number().min(0).max(100_000),
  transport_km_bus: z.number().min(0).max(100_000),
  transport_km_train: z.number().min(0).max(100_000),
  flights_short_haul: z.number().int().min(0).max(50),
  flights_long_haul: z.number().int().min(0).max(20),
  home_electricity_kwh: z.number().min(0).max(50_000),
  home_gas_kwh: z.number().min(0).max(50_000),
  household_size: z.number().int().min(1).max(10),
  diet_type: z.enum(['meat_heavy', 'meat_medium', 'vegetarian', 'vegan']),
  consumption_level: z.enum(['high', 'medium', 'low']),
  device_id: z
    .string()
    .min(8, 'Device ID must be at least 8 characters')
    .max(64, 'Device ID must be at most 64 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Device ID may only contain letters, numbers, hyphens and underscores'
    ),
});

export type CarbonInputForm = z.infer<typeof carbonInputSchema>;

/**
 * Validate carbon input data. Returns Zod SafeParseResult.
 * Use result.success to check validity and result.error.flatten() for field errors.
 */
export const validateCarbonInput = (data: unknown) => carbonInputSchema.safeParse(data);
