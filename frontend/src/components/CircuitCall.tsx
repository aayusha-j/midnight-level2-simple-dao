import { useState } from 'react';
import type { DaoDeployment } from '../lib/dao-contract';

export interface CircuitCallProps {
  deployed: DaoDeployment | null;
}

const MEMBER_SECRET_KEY = 'simple-dao-member-secret';

function loadOrCreateSecret(): Uint8Array {
  const stored = localStorage.getItem(MEMBER_SECRET_KEY);
  if (stored) {
    return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  }
  const secret = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(MEMBER_SECRET_KEY, btoa(String.fromCharCode(...secret)));
  return secret;
}

type CallState = 'idle' | 'proving' | 'submitting' | 'done';

export default function CircuitCall({ deployed }: CircuitCallProps) {
  const [state, setState] = useState<CallState>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = state === 'proving' || state === 'submitting';

  const handleCall = async () => {
    if (!deployed) {
      setError('Connect your wallet first.');
      return;
    }
    setState('proving');
    setError(null);
    setTxId(null);
    try {
      // The member credential is a private circuit input. It is generated and
      // kept only in the browser and is NEVER rendered in the UI.
      const secret = loadOrCreateSecret();
      const result = await deployed.callTx.registerMember(secret);
      setState('submitting');
      setTxId(result.public.txId);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  };

  return (
    <div className="card">
      <h2>Circuit call</h2>
      <p className="muted">
        Invokes the <code>registerMember</code> circuit on the deployed contract. The proof is
        generated locally in your browser, then the result is submitted on-chain.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void handleCall()}
        disabled={busy || !deployed}
      >
        {state === 'proving'
          ? 'Proving locally…'
          : state === 'submitting'
            ? 'Submitting on-chain…'
            : 'Call circuit'}
      </button>

      {busy && (
        <p className="busy-label">
          {state === 'proving'
            ? '⏳ Generating zero-knowledge proof in the browser…'
            : '⏳ Submitting the proven transaction on-chain…'}
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {txId && (
        <p className="tx-result">
          Transaction submitted on-chain: <code title={txId}>{txId.slice(0, 12)}…</code>
        </p>
      )}
      <p className="privacy-note">Proved without revealing your input.</p>
    </div>
  );
}
