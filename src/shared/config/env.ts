import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_NAME: z.string().default('Project Manager'),
  VITE_ENABLE_DEBUG: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success){
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  appName: parsed.data.VITE_APP_NAME,
  enableDebug: parsed.data.VITE_ENABLE_DEBUG,
}