CREATE TABLE "AiSwapCheck" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scoreSnapshotId" TEXT,
    "amountTon" TEXT NOT NULL,
    "slippageTolerance" TEXT NOT NULL,
    "quote" JSONB NOT NULL,
    "promptInput" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "body" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSwapCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSwapCheck_assetId_createdAt_idx" ON "AiSwapCheck"("assetId", "createdAt");
CREATE INDEX "AiSwapCheck_scoreSnapshotId_idx" ON "AiSwapCheck"("scoreSnapshotId");

ALTER TABLE "AiSwapCheck" ADD CONSTRAINT "AiSwapCheck_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSwapCheck" ADD CONSTRAINT "AiSwapCheck_scoreSnapshotId_fkey" FOREIGN KEY ("scoreSnapshotId") REFERENCES "ScoreSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
