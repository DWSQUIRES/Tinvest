CREATE TYPE "AlertType" AS ENUM ('SCORE_ABOVE', 'RISK_ABOVE', 'RANK_TOP', 'LIQUIDITY_DROP', 'VOLUME_SPIKE');
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'PAUSED');

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "decimals" INTEGER,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "baseAssetId" TEXT NOT NULL,
    "quoteAssetId" TEXT,
    "lpFeeBps" INTEGER,
    "protocolFeeBps" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PoolMetricSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liquidityUsd" DECIMAL(30,8),
    "volume24hUsd" DECIMAL(30,8),
    "volume7dUsd" DECIMAL(30,8),
    "priceUsd" DECIMAL(30,12),
    "txCount24h" INTEGER,
    "raw" JSONB NOT NULL,
    CONSTRAINT "PoolMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rank" INTEGER,
    "opportunityScore" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "liquidityScore" INTEGER NOT NULL,
    "activityScore" INTEGER NOT NULL,
    "marketHealthScore" INTEGER NOT NULL,
    "stabilityScore" INTEGER NOT NULL,
    "ecosystemScore" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramUser" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "threshold" DECIMAL(30,8),
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SentAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SentAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scoreSnapshotId" TEXT,
    "body" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "message" TEXT,
    "metadata" JSONB,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pool_address_key" ON "Pool"("address");
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");
CREATE INDEX "Pool_baseAssetId_idx" ON "Pool"("baseAssetId");
CREATE INDEX "Pool_quoteAssetId_idx" ON "Pool"("quoteAssetId");
CREATE INDEX "PoolMetricSnapshot_poolId_capturedAt_idx" ON "PoolMetricSnapshot"("poolId", "capturedAt");
CREATE INDEX "PoolMetricSnapshot_capturedAt_idx" ON "PoolMetricSnapshot"("capturedAt");
CREATE INDEX "ScoreSnapshot_assetId_capturedAt_idx" ON "ScoreSnapshot"("assetId", "capturedAt");
CREATE INDEX "ScoreSnapshot_rank_idx" ON "ScoreSnapshot"("rank");
CREATE INDEX "ScoreSnapshot_capturedAt_idx" ON "ScoreSnapshot"("capturedAt");
CREATE UNIQUE INDEX "TelegramUser_telegramId_key" ON "TelegramUser"("telegramId");
CREATE UNIQUE INDEX "Watchlist_userId_assetId_key" ON "Watchlist"("userId", "assetId");
CREATE INDEX "Watchlist_assetId_idx" ON "Watchlist"("assetId");
CREATE INDEX "AlertRule_userId_status_idx" ON "AlertRule"("userId", "status");
CREATE INDEX "AlertRule_assetId_idx" ON "AlertRule"("assetId");
CREATE UNIQUE INDEX "SentAlert_userId_fingerprint_key" ON "SentAlert"("userId", "fingerprint");
CREATE INDEX "SentAlert_assetId_sentAt_idx" ON "SentAlert"("assetId", "sentAt");
CREATE INDEX "GeneratedReport_assetId_createdAt_idx" ON "GeneratedReport"("assetId", "createdAt");
CREATE INDEX "JobRun_name_startedAt_idx" ON "JobRun"("name", "startedAt");

ALTER TABLE "Pool" ADD CONSTRAINT "Pool_baseAssetId_fkey" FOREIGN KEY ("baseAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_quoteAssetId_fkey" FOREIGN KEY ("quoteAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PoolMetricSnapshot" ADD CONSTRAINT "PoolMetricSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SentAlert" ADD CONSTRAINT "SentAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_scoreSnapshotId_fkey" FOREIGN KEY ("scoreSnapshotId") REFERENCES "ScoreSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
