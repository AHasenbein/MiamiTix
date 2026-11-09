import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "../../");

dotenv.config({
  path: path.join(projectRootPath, ".env")
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  APP_WEB_URL: z.url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1).default("ticketsplice"),
  TRUSTED_SELLER_EMAILS: z.string().default(""),
  // Inbox for "apply to be a verified seller" submissions. Falls back to the first TRUSTED_SELLER_EMAILS entry.
  SELLER_APPLICATIONS_EMAIL: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.email().optional()),
  REQUIRE_EMAIL_VERIFICATION: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  EMAIL_FROM: z
    .string()
    .trim()
    .min(3)
    .refine(
      (value) => {
        const displayNameMatch = /<([^>]+)>\s*$/.exec(value);
        const emailCandidate = displayNameMatch ? displayNameMatch[1].trim() : value.trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate);
      },
      { message: "EMAIL_FROM must be an email or \"Name <email@domain>\" format." }
    )
    .optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.url().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formatted = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration. ${formatted}`);
}

export const env = parsedEnv.data;
