import type { Prisma, PrismaClient, ScoreSnapshot } from "@prisma/client";
import { env } from "../config/env.js";
import { formatSwapCheck, SwapCheckGenerator, type AiSwapCheckInput } from "../llm/swap-check.js";
import { AiSwapCheckRepository } from "../repositories/ai-swap-checks.js";
import { AssetRepository } from "../repositories/assets.js";
import { ScoreRepository } from "../repositories/scores.js";
import { StonfiSwapService, type SwapQuote } from "./swap/stonfi-swap.js";

export class AiSwapCheckService {
  private readonly assets: AssetRepository;
  private readonly scores: ScoreRepository;
  private readonly swap: StonfiSwapService;
  private readonly checks: AiSwapCheckRepository;
  private readonly generator = new SwapCheckGenerator();

  constructor(private readonly db: PrismaClient) {
    this.assets = new AssetRepository(db);
    this.scores = new ScoreRepository(db);
    this.swap = new StonfiSwapService(db);
    this.checks = new AiSwapCheckRepository(db);
  }

  async create(input: { token: string; amountTon: string; slippageTolerance?: string }) {
    const asset = await this.assets.findAssetByQuery(input.token);
    if (!asset) {
      throw new Error(`Token not found in collected STON.fi assets: ${input.token}`);
    }

    const [quote, score] = await Promise.all([
      this.swap.quote({
        token: asset.id,
        amountTon: input.amountTon,
        slippageTolerance: input.slippageTolerance
      }),
      this.scores.latestForAsset(asset.id)
    ]);
    const promptInput = buildPromptInput(quote, score);
    const generated = await this.generator.generate(promptInput);
    const body = formatSwapCheck(generated.check);
    const saved = await this.checks.create({
      assetId: asset.id,
      scoreSnapshotId: score?.id,
      amountTon: input.amountTon,
      slippageTolerance: input.slippageTolerance ?? env.DEFAULT_SWAP_SLIPPAGE,
      quote: quote as unknown as Prisma.InputJsonValue,
      promptInput: promptInput as unknown as Prisma.InputJsonValue,
      output: generated.check as unknown as Prisma.InputJsonValue,
      body,
      model: generated.model
    });

    return {
      quote,
      check: generated.check,
      body,
      id: saved.id,
      model: generated.model
    };
  }
}

export function buildPromptInput(quote: SwapQuote, score: ScoreSnapshot | null): AiSwapCheckInput {
  return {
    token: {
      symbol: quote.target.symbol,
      name: quote.target.name,
      address: quote.target.address
    },
    quote: {
      offerAmount: quote.offerAmount,
      askAmount: quote.askAmount,
      minAskAmount: quote.minAskAmount,
      slippageTolerance: quote.slippageTolerance,
      swapRate: quote.swapRate,
      priceImpact: quote.priceImpact,
      poolAddress: quote.poolAddress
    },
    score: score
      ? {
          rank: score.rank,
          opportunityScore: score.opportunityScore,
          riskScore: score.riskScore,
          liquidityScore: score.liquidityScore,
          activityScore: score.activityScore,
          marketHealthScore: score.marketHealthScore,
          stabilityScore: score.stabilityScore,
          ecosystemScore: score.ecosystemScore,
          reasons: score.reasons,
          metrics: score.metrics
        }
      : undefined
  };
}
