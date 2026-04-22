import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load env vars from .env.local then .env (Next.js convention)
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
