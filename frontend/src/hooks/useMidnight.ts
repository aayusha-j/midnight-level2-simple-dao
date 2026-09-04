import { useCallback, useEffect, useRef, useState } from 'react';
import { connectAndFindContract, getCachedDeployment, type DaoDeployment } from '../lib/dao-contract';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'no-wallet' | 'error';

export interface UseMidnightResult {
  state: ConnectionState;
  deployed: DaoDeployment | null;
  unshieldedAddress: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

/**
 * Turns a thrown wallet/provider error into a short, human-friendly message so
 * the UI can distinguish the three common failure modes:
 *   - wallet not installed        -> "no-wallet" state
 *   - user rejected the request   -> "Request rejected"
 *   - network mismatch            -> explicit network guidance
 */
function classifyConnectError(err: unknown, raw: string): string {
  const text = `${raw} ${err instanceof Error ? err.message : ''}`.toLowerCase();
  if (text.includes('reject') || text.includes('denied') || text.includes('user canceled') || text.includes('cancel')) {
    return 'Connection request rejected in the wallet. Click Connect Wallet to try again.';
  }
  if (
    text.includes('network') ||
    text.includes('networks') ||
    text.includes('not found') ||
    text.includes('connect') && (text.includes('network') || text.includes('networkid'))
  ) {
    return 'Network mismatch. Select the Preview network in your Midnight Wallet and try again.';
  }
  return raw;
}

export function useMidnight(contractAddress: string | null): UseMidnightResult {
  const [state, setState] = useState<ConnectionState>('idle');
  const [deployed, setDeployed] = useState<DaoDeployment | null>(getCachedDeployment());
  const [unshieldedAddress, setUnshieldedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef(contractAddress);
  addressRef.current = contractAddress;

  useEffect(() => {
    if (!contractAddress) return;
    const cached = getCachedDeployment();
    if (cached) {
      setDeployed(cached);
      setState('connected');
      return;
    }
    if ((window as unknown as { midnight?: unknown }).midnight == null) {
      setState('no-wallet');
    }
  }, [contractAddress]);

  const connect = useCallback(async () => {
    if (!addressRef.current) {
      setError('No contract address configured. Set VITE_DAO_CONTRACT_ADDRESS before deploying the frontend.');
      return;
    }
    setState('connecting');
    setError(null);
    try {
      const deployment = await connectAndFindContract(addressRef.current);
      setDeployed(deployment);
      setUnshieldedAddress(deployment.unshieldedAddress);
      setState('connected');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(classifyConnectError(e, msg));
      setState((window as unknown as { midnight?: unknown }).midnight == null ? 'no-wallet' : 'error');
    }
  }, []);

  const disconnect = useCallback(() => {
    // Providers are process-wide singletons; disconnecting only drops the UI
    // session so the user can reconnect with a different wallet/account.
    setDeployed(null);
    setUnshieldedAddress(null);
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    deployed,
    unshieldedAddress,
    error,
    connect,
    disconnect,
    isConnected: state === 'connected' && deployed !== null,
  };
}