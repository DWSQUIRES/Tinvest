import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  STONFI_API_BASE_URL: z.string().url().default("https://api.ston.fi"),
  STONFI_SWAP_BASE_URL: z.string().url().default("https://app.ston.fi/swap"),
  STONFI_TON_ASSET_ADDRESS: z.string().default("EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"),
  STONFI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  STONFI_REQUEST_RETRIES: z.coerce.number().int().min(1).default(3),
  STONFI_MAX_POOLS: z.coerce.number().int().positive().default(1_000),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_WIRE_API: z.enum(["responses", "chat_completions"]).default("responses"),
  OPENAI_REASONING_EFFORT: z.string().optional().default(""),
  OPENAI_DISABLE_RESPONSE_STORAGE: z.coerce.boolean().default(true),
  COLLECTOR_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  SCORER_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  ALERT_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  MARKET_STALE_AFTER_MS: z.coerce.number().int().positive().default(1_800_000),
  TOP_LIST_SIZE: z.coerce.number().int().positive().default(10),
  MIN_LIQUIDITY_USD: z.coerce.number().nonnegative().default(10_000),
  SCORE_ALERT_THRESHOLD: z.coerce.number().int().min(1).max(100).default(70),
  RISK_ALERT_THRESHOLD: z.coerce.number().int().min(1).max(100).default(65),
  RANK_ALERT_TOP_N: z.coerce.number().int().positive().default(10),
  MINI_APP_PUBLIC_URL: z.string().url().default("https://example.com"),
  MINI_APP_NAME: z.string().default("TON Economic Watchers"),
  MINI_APP_ICON_URL: z.string().url().default("https://example.com/icon.png"),
  TON_RPC_ENDPOINT: z.string().url().default("https://toncenter.com/api/v2/jsonRPC"),
  TON_RPC_API_KEY: z.string().optional().default(""),
  DEFAULT_SWAP_SLIPPAGE: z.string().default("0.01"),
  SERVER_PORT: z.coerce.number().int().positive().default(3000)
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
