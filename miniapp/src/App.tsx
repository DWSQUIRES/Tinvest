import { TonConnectButton, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useEffect, useMemo, useState } from "react";

type AppProps = {
  defaultSlippage: string;
};

type Quote = {
  offerAmount: string;
  askAmount: string;
  minAskAmount: string;
  slippageTolerance: string;
  swapRate: string;
  priceImpact: string;
  routerAddress: string;
  poolAddress: string;
  target: {
    symbol: string;
    name?: string | null;
    address: string;
  };
  score?: {
    opportunityScore: number;
    riskScore: number;
    rank?: number | null;
  };
};

export function App({ defaultSlippage }: AppProps) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [token, setToken] = useState(params.get("token") ?? params.get("symbol") ?? "STON");
  const [amountTon, setAmountTon] = useState(params.get("amount") ?? "1");
  const [slippageTolerance, setSlippageTolerance] = useState(params.get("slippage") ?? defaultSlippage);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const walletAddress = useTonAddress();
  const [tonConnectUi] = useTonConnectUI();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshQuote();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [token, amountTon, slippageTolerance]);

  async function refreshQuote() {
    if (!token || !amountTon) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, amountTon, slippageTolerance })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Quote failed");
      }
      setQuote(body);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitSwap() {
    if (!walletAddress) {
      setError("Connect your wallet first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/swap/transaction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, amountTon, slippageTolerance, walletAddress })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not build transaction");
      }

      await tonConnectUi.sendTransaction(body.transaction);
      setError("Transaction sent to your wallet. Check wallet status for confirmation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>TON Economic Watchers</h1>
          <p>Swap with STON.fi routing and wallet approval.</p>
        </div>
        <TonConnectButton />
      </header>

      <section className="swapPanel">
        <label>
          Buy token
          <input value={token} onChange={(event) => setToken(event.target.value.trim())} placeholder="STON or token address" />
        </label>

        <label>
          Spend TON
          <input inputMode="decimal" value={amountTon} onChange={(event) => setAmountTon(event.target.value.trim())} />
        </label>

        <label>
          Slippage
          <select value={slippageTolerance} onChange={(event) => setSlippageTolerance(event.target.value)}>
            <option value="0.005">0.5%</option>
            <option value="0.01">1%</option>
            <option value="0.02">2%</option>
            <option value="0.05">5%</option>
          </select>
        </label>

        <button className="primary" disabled={!quote || submitting || loading} onClick={submitSwap}>
          {submitting ? "Waiting for wallet..." : "Review in wallet"}
        </button>
      </section>

      <section className="quotePanel">
        <h2>Quote</h2>
        {loading && <p>Fetching STON.fi quote...</p>}
        {error && <p className="status">{error}</p>}
        {quote && (
          <dl>
            <dt>Target</dt>
            <dd>{quote.target.symbol}</dd>
            <dt>Expected receive</dt>
            <dd>{quote.askAmount}</dd>
            <dt>Minimum receive</dt>
            <dd>{quote.minAskAmount}</dd>
            <dt>Swap rate</dt>
            <dd>{quote.swapRate}</dd>
            <dt>Price impact</dt>
            <dd>{Number(quote.priceImpact).toFixed(3)}%</dd>
            <dt>Watcher score</dt>
            <dd>{quote.score ? `${quote.score.opportunityScore}/100 risk ${quote.score.riskScore}/100` : "n/a"}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
