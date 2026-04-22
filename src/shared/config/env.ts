import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  VITE_APP_NAME: z.string().min(1, 'VITE_APP_NAME is required'),
  VITE_ENABLE_DEBUG: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
})

type Env = z.infer<typeof envSchema>

const parseEnv = (): Env => {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error('Environment validation failed:', result.error.format())
    throw new Error('Invalid environment variables')
  }

  return result.data
}

const _env = parseEnv()

export const env = {
  apiUrl: _env.VITE_API_URL,
  appName: _env.VITE_APP_NAME,
  enableDebug: _env.VITE_ENABLE_DEBUG,
}
