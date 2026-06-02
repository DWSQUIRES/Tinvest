# TON Economic Watchers

Telegram-native MVP for monitoring TON assets with STON.fi data. It collects pool metrics, computes deterministic opportunity/risk scores, explains rankings through concise reports, and supports user-approved Telegram Mini App swaps.

## What It Does

- Polls STON.fi `/v1/assets` and `/v1/pools`, then monitors the highest-liquidity pools configured by `STONFI_MAX_POOLS`.
- Stores pool metric snapshots in Postgres.
- Scores assets by liquidity, activity, market health, stability, and STON.fi ecosystem presence.
- Sends Telegram bot responses for top assets, risk assets, watchlists, reports, and alert rules.
- Uses an LLM for report wording and pre-swap risk checks. If no `OPENAI_API_KEY` is configured, deterministic fallback text/checks are used.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in `DATABASE_URL` and `TELEGRAM_BOT_TOKEN`. `OPENAI_API_KEY` is optional.
   `STONFI_MAX_POOLS` defaults to `1000` so the MVP starts with the most liquid pools instead of the full long tail.

4. Start Postgres:

   ```bash
   docker compose up -d postgres
   ```

5. Apply migrations and generate Prisma client:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

6. Bootstrap data:

   ```bash
   npm run run:collector
   npm run run:scorer
   ```

7. Start the bot and workers:

   ```bash
   npm run dev:bot
   npm run dev:collector
   npm run dev:scorer
   npm run dev:alerts
   ```

## Telegram Commands

- `/start` - onboarding and disclaimer.
- `/top` - top ranked assets.
- `/risk` - highest-risk scored assets.
- `/watch <symbol or address>` - add an asset to your watchlist.
- `/unwatch <symbol or address>` - remove an asset from your watchlist.
- `/watchlist` - show watched assets with latest scores.
- `/report <symbol or address>` - explain the latest score.
- `/swapcheck <symbol or address> <TON amount>` - run an AI pre-swap risk check using STON.fi quote and watcher data.
- `/buy <symbol or address> [TON amount]` - open a user-approved Telegram Mini App swap.
- `/alerts` - list active alert rules.

## Verification

```bash
npm run typecheck
npm test
npm run health
```

`npm run health` expects recent successful collector and scorer runs in Postgres.

## Notes

- Scores are deterministic and auditable; the LLM cannot change rankings.
- STON.fi is the only market data source in this MVP.
- `/buy` never touches wallet keys. It opens the Telegram Mini App, which uses STON.fi quote/transaction building plus TON Connect wallet approval.
- AI swap checks are warn-only. They summarize quote impact, score context, and invalidation signals, but they do not block user-approved swaps.
- This is not financial advice and should not be presented as automated portfolio management.

## Telegram Mini App Swaps

The in-Telegram swap flow needs a public HTTPS URL because TON Connect wallets must read `tonconnect-manifest.json`.

Set these values in `.env` before using `/buy` in production:

```bash
MINI_APP_PUBLIC_URL="https://your-public-domain.example"
MINI_APP_ICON_URL="https://your-public-domain.example/icon.png"
TON_RPC_ENDPOINT="https://toncenter.com/api/v2/jsonRPC"
TON_RPC_API_KEY=""
```

Run locally:

```bash
npm run dev:server
npm run dev:miniapp
```

For Telegram testing, expose the server with an HTTPS tunnel and set `MINI_APP_PUBLIC_URL` to that HTTPS URL.

The Mini App calls `/api/swap/quote`, `/api/ai/swap-check`, and `/api/swap/transaction` from the same server. The AI check is persisted in Postgres for later review.
