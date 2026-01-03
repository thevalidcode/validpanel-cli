import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Define schema
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SOCIAL_MEDIA_STORE_PORT: z.coerce.number().default(6060),
  SHOP_PORT: z.coerce.number().default(7030),
});

// Parse and validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
