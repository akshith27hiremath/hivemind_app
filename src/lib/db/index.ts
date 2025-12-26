import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

/**
 * Database connection singleton
 *
 * In development, we use a global variable to prevent
 * creating multiple connections during hot reloading.
 */

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const connectionString = env.DATABASE_URL;

// For query purposes
const queryClient = postgres(connectionString);

// Create drizzle instance with schema
export const db = globalThis._db ?? drizzle(queryClient, { schema });

if (env.isDevelopment) {
  globalThis._db = db;
}

// Export schema for convenience
export { schema };

// Export types
export type Database = typeof db;
