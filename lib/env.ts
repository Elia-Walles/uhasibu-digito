import { z } from "zod";

/**
 * Server-side env loader. Validates shape so a misconfigured deployment fails
 * loudly rather than at some random runtime query.
 *
 * Wave 0 keeps validation LENIENT (non-empty strings; most vars optional) so the
 * placeholder `.env` passes and the demo build stays green. Wave 1 tightens this
 * (url() on connection strings, required Resend/S3 once those modules ship) when
 * real credentials are provisioned.
 *
 * Server-only — never import from a Client Component (it reads secret env vars).
 * NEXT_PUBLIC_* values are client-safe and read directly where needed.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (TiDB / MySQL)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),

  // Auth.js v5
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().min(1).optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),

  // File storage (R2 / S3)
  S3_ENDPOINT: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Parse + memoise the server environment. Throws on the first call if invalid. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse(process.env);
  }
  return cached;
}
