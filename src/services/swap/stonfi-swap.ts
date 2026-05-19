import { StonApiClient, type SwapSimulation } from "@ston-fi/api";
import { Client, dexFactory } from "@ston-fi/sdk";
import type { SenderArguments } from "@ton/core";
import { env } from "../../config/env.js";
import { AssetRepository } from "../../repositories/assets.js";
import { ScoreRepository } from "../../repositories/scores.js";
import type { PrismaClient } from "@prisma/client";
import { decimalToUnits, unitsToDecimal } from "./units.js";

export type SwapQuote = {
  offerAddress: string;
  askAddress: string;
  offerUnits: string;
  askUnits: string;
  minAskUnits: string;
  offerAmount: string;
  askAmount: string;
  minAskAmount: string;
  slippageTolerance: string;
  swapRate: string;
  priceImpact: string;
  routerAddress: string;
  poolAddress: string;
  gasForward: string;
  gasBudget?: string;
  target: {
    symbol: string;
    name?: string | null;
    address: string;
    decimals: number;
  };
  score?: {
    opportunityScore: number;
    riskScore: number;
    rank?: number | null;
  };
};

export type TonConnectTransaction = {
  validUntil: number;
  messages: Array<{
    address: string;
    amount: string;
    payload?: string;
  }>;
};

export class StonfiSwapService {
  private readonly api = new StonApiClient({ baseURL: env.STONFI_API_BASE_URL });
  private readonly ton = new Client({
    endpoint: env.TON_RPC_ENDPOINT,
    apiKey: env.TON_RPC_API_KEY || undefined
  });
  private readonly assets: AssetRepository;
  private readonly scores: ScoreRepository;

  constructor(private readonly db: PrismaClient) {
    this.assets = new AssetRepository(db);
    this.scores = new ScoreRepository(db);
  }

  async quote(input: { token: string; amountTon: string; slippageTolerance?: string }): Promise<SwapQuote> {
    const asset = await this.resolveAsset(input.token);
    const decimals = asset.decimals ?? 9;
    const simulation = await this.simulate({
      askAddress: asset.id,
      amountTon: input.amountTon,
      slippageTolerance: input.slippageTolerance
    });
    const score = await this.scores.latestForAsset(asset.id);

    return {
      offerAddress: simulation.offerAddress,
      askAddress: simulation.askAddress,
      offerUnits: simulation.offerUnits,
      askUnits: simulation.askUnits,
      minAskUnits: simulation.minAskUnits,
      offerAmount: input.amountTon,
      askAmount: unitsToDecimal(simulation.askUnits, decimals),
      minAskAmount: unitsToDecimal(simulation.minAskUnits, decimals),
      slippageTolerance: simulation.slippageTolerance,
      swapRate: simulation.swapRate,
      priceImpact: simulation.priceImpact,
      routerAddress: simulation.routerAddress,
      poolAddress: simulation.poolAddress,
      gasForward: simulation.gasParams.forwardGas,
      gasBudget: simulation.gasParams.gasBudget,
      target: {
        symbol: asset.symbol,
        name: asset.name,
        address: asset.id,
        decimals
      },
      score: score
        ? {
            opportunityScore: score.opportunityScore,
            riskScore: score.riskScore,
            rank: score.rank
          }
        : undefined
    };
  }

  async transaction(input: {
    token: string;
    amountTon: string;
    walletAddress: string;
    slippageTolerance?: string;
  }): Promise<{ quote: SwapQuote; transaction: TonConnectTransaction }> {
    const asset = await this.resolveAsset(input.token);
    const simulation = await this.simulate({
      askAddress: asset.id,
      amountTon: input.amountTon,
      slippageTolerance: input.slippageTolerance
    });
    const quote = await this.quote({
      token: asset.id,
      amountTon: input.amountTon,
      slippageTolerance: input.slippageTolerance
    });
    const txParams = await this.buildTonToJettonTxParams(simulation, input.walletAddress);

    return {
      quote,
      transaction: {
        validUntil: Math.floor(Date.now() / 1000) + 10 * 60,
        messages: [
          {
            address: txParams.to.toString({ urlSafe: true, bounceable: true }),
            amount: txParams.value.toString(),
            payload: txParams.body?.toBoc().toString("base64")
          }
        ]
      }
    };
  }

  private async resolveAsset(query: string) {
    const asset = await this.assets.findAssetByQuery(query);
    if (!asset) {
      throw new Error(`Token not found in collected STON.fi assets: ${query}`);
    }

    if (asset.symbol.toUpperCase() === "TON" || asset.id === env.STONFI_TON_ASSET_ADDRESS) {
      throw new Error("TON is the input asset. Choose a jetton to buy with TON.");
    }

    return asset;
  }

  private async simulate(input: {
    askAddress: string;
    amountTon: string;
    slippageTolerance?: string;
  }): Promise<SwapSimulation> {
    const offerUnits = decimalToUnits(input.amountTon, 9);
    if (BigInt(offerUnits) <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    return this.api.simulateSwap({
      offerAddress: env.STONFI_TON_ASSET_ADDRESS,
      askAddress: input.askAddress,
      offerUnits,
      slippageTolerance: input.slippageTolerance ?? env.DEFAULT_SWAP_SLIPPAGE,
      dexV2: true
    });
  }

  private async buildTonToJettonTxParams(simulation: SwapSimulation, walletAddress: string): Promise<SenderArguments> {
    const dex = dexFactory(simulation.router);
    const router = this.ton.open(dex.Router.create(simulation.router.address));
    const proxyTon = dex.pTON.create(simulation.router.ptonMasterAddress);

    return router.getSwapTonToJettonTxParams({
      userWalletAddress: walletAddress,
      receiverAddress: walletAddress,
      refundAddress: walletAddress,
      excessesAddress: walletAddress,
      proxyTon,
      askJettonAddress: simulation.askAddress,
      askJettonWalletAddress: simulation.askJettonWallet,
      offerAmount: simulation.offerUnits,
      minAskAmount: simulation.minAskUnits,
      forwardGasAmount: simulation.gasParams.forwardGas
    });
  }
}
