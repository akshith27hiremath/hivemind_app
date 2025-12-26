/**
 * Environment variable validation and type-safe access
 */

const requiredServerEnvVars = ["DATABASE_URL"] as const;

type RequiredServerEnvVar = (typeof requiredServerEnvVars)[number];

function getEnvVar(key: RequiredServerEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Validates that all required environment variables are set.
 * Call this at application startup.
 */
export function validateEnv(): void {
  for (const envVar of requiredServerEnvVars) {
    getEnvVar(envVar);
  }
}

/**
 * Type-safe environment variable access
 */
export const env = {
  get DATABASE_URL() {
    return getEnvVar("DATABASE_URL");
  },
  get NODE_ENV() {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isDevelopment() {
    return process.env.NODE_ENV === "development";
  },
} as const;
