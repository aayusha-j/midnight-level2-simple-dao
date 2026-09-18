import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { Contract as SimpleDaoContract, ledger, type Ledger } from '../../../contracts/managed/simple-dao/contract/index.js';
import { FetchZkConfigProvider } from './fetch-zk-config';
import { InMemoryPrivateStateProvider } from './in-memory-pstate';
import { type Proposal, statusToLabel } from './dao-types';

export type DaoCircuitKeys = 'registerMember' | 'submitProposal' | 'vote' | 'executeProposal';

const PRIVATE_STATE_ID = 'simple-dao-frontend-private-state';
const COMPATIBLE_CONNECTOR_API_VERSION = /^4\./;

export interface DaoDeployment {
  contractAddress: string;
  networkId: string;
  unshieldedAddress: string;
  callTx: {
    registerMember(secret: Uint8Array): Promise<{ public: { txId: string } }>;
    submitProposal(
      title: string,
      amount: bigint,
      recipient: Uint8Array,
      deadline: bigint,
      quorum: bigint,
    ): Promise<{ public: { txId: string } }>;
    vote(proposalId: bigint, choice: boolean, secret: Uint8Array): Promise<{ public: { txId: string } }>;
    executeProposal(proposalId: bigint): Promise<{ public: { txId: string } }>;
  };
  reads: {
    getProposals(): Promise<Proposal[]>;
    getTreasury(): Promise<bigint>;
    getMemberCount(): Promise<number>;
    isMember(commitment: Uint8Array): Promise<boolean>;
  };
}

let cachedDeployment: DaoDeployment | null = null;

function getFirstCompatibleWallet(): InitialAPI | undefined {
  const injected = (window as unknown as Record<string, unknown>).midnight as Record<string, unknown> | undefined;
  if (!injected) return undefined;
  return Object.values(injected).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      COMPATIBLE_CONNECTOR_API_VERSION.test((wallet as InitialAPI).apiVersion),
  );
}

function waitForWallet(timeoutMs = 6000): Promise<InitialAPI> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const wallet = getFirstCompatibleWallet();
      if (wallet) {
        resolve(wallet);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(
          new Error(
            'Could not find a compatible Midnight Wallet (API "4.x"). Install the Midnight Wallet browser extension and refresh this page.',
          ),
        );
        return;
      }
      setTimeout(poll, 150);
    };
    poll();
  });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return out;
}

/**
 * Connects to the wallet, builds all Midnight providers and locates the
 * deployed Simple DAO contract at `contractAddress`. Subsequent calls reuse the
 * same providers (contract calls are single-call `callTx` sessions, so no
 * private state needs to be persisted between actions).
 *
 * PRIVACY NOTE: member credentials and ballot choices are one-shot circuit
 * inputs. They are never stored in the in-memory private state provider, never
 * persisted, and never logged.
 */
export async function connectAndFindContract(contractAddress: string): Promise<DaoDeployment> {
  if (cachedDeployment) {
    return cachedDeployment;
  }

  const wallet = await waitForWallet();
  const networkId = (import.meta.env.VITE_DAO_NETWORK_ID as string | undefined) ?? 'preview';

  console.group('[connectAndFindContract] Calling wallet.connect()');
  console.log('networkId arg:', networkId);
  console.log('wallet object keys:', wallet ? Object.keys(wallet) : 'null/undefined');
  console.log('typeof wallet.connect:', typeof wallet.connect);
  console.log('wallet.apiVersion:', (wallet as Record<string, unknown>).apiVersion);

  let connected;
  try {
    connected = await wallet.connect(networkId);
    console.log('wallet.connect() succeeded:', connected);
  } catch (err) {
    console.error('[connectAndFindContract] wallet.connect() THREW:', err);
    console.error('[connectAndFindContract] error type:', typeof err);
    console.error('[connectAndFindContract] error constructor:', err?.constructor?.name);
    console.error('[connectAndFindContract] error prototype chain:', Object.getPrototypeOf(err)?.constructor?.name);

    if (err instanceof Error) {
      console.error('[connectAndFindContract] name:', err.name);
      console.error('[connectAndFindContract] message:', err.message);
      console.error('[connectAndFindContract] stack:', err.stack);
      if ('cause' in err) console.error('[connectAndFindContract] cause:', (err as { cause: unknown }).cause);
    }

    try {
      console.error('[connectAndFindContract] error serialized:', JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})));
    } catch (serErr) {
      console.error('[connectAndFindContract] error NOT serializable:', serErr);
    }

    for (const key of Object.getOwnPropertyNames(err ?? {})) {
      console.error(`[connectAndFindContract] err.${key}:`, (err as Record<string, unknown>)[key]);
    }

    console.groupEnd();
    throw err;
  }

  console.log('wallet.connect() result keys:', connected ? Object.keys(connected) : 'null/undefined');
  console.groupEnd();

  console.group('[connectAndFindContract] post-connect steps');

  let config;
  try {
    console.log('[step 1] calling connected.getConfiguration()...');
    config = await connected.getConfiguration();
    console.log('[step 1] getConfiguration() succeeded:', config);
  } catch (err) {
    console.error('[step 1] getConfiguration() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  try {
    console.log('[step 2] calling setNetworkId(', config.networkId, ')...');
    setNetworkId(config.networkId);
    console.log('[step 2] setNetworkId() succeeded');
  } catch (err) {
    console.error('[step 2] setNetworkId() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let unshieldedAddress: string;
  try {
    console.log('[step 3] calling connected.getUnshieldedAddress()...');
    unshieldedAddress = (await connected.getUnshieldedAddress()).unshieldedAddress;
    console.log('[step 3] getUnshieldedAddress() succeeded:', unshieldedAddress);
  } catch (err) {
    console.error('[step 3] getUnshieldedAddress() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let shielded: Awaited<ReturnType<typeof connected.getShieldedAddresses>>;
  try {
    console.log('[step 4] calling connected.getShieldedAddresses()...');
    shielded = await connected.getShieldedAddresses();
    console.log('[step 4] getShieldedAddresses() succeeded, keys:', shielded ? Object.keys(shielded) : 'null/undefined');
  } catch (err) {
    console.error('[step 4] getShieldedAddresses() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let zkConfigProvider: FetchZkConfigProvider<DaoCircuitKeys>;
  try {
    console.log('[step 5] constructing FetchZkConfigProvider...');
    zkConfigProvider = new FetchZkConfigProvider<DaoCircuitKeys>(`${window.location.origin}/zk/simple-dao`);
    console.log('[step 5] FetchZkConfigProvider constructed');
  } catch (err) {
    console.error('[step 5] FetchZkConfigProvider constructor THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let proofProvider: ReturnType<typeof httpClientProofProvider>;
  try {
    const proverServerUri =
      config.proverServerUri ?? (import.meta.env.VITE_DAO_PROOF_SERVER as string | undefined) ?? '';
    console.log('[step 6] calling httpClientProofProvider() with proverServerUri:', proverServerUri);
    proofProvider = httpClientProofProvider(proverServerUri, zkConfigProvider);
    console.log('[step 6] httpClientProofProvider() succeeded');
  } catch (err) {
    console.error('[step 6] httpClientProofProvider() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  try {
    console.log('[step 7] calling indexerPublicDataProvider() with indexerUri:', config.indexerUri, 'indexerWsUri:', config.indexerWsUri);
    publicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);
    console.log('[step 7] indexerPublicDataProvider() succeeded');
  } catch (err) {
    console.error('[step 7] indexerPublicDataProvider() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  const buildProviders = () => ({
    privateStateProvider: new InMemoryPrivateStateProvider<string, Record<string, never>>(),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (tx: unknown) => {
        const receive = await connected.balanceUnsealedTransaction(toHex((tx as { serialize(): Uint8Array }).serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(receive.tx),
        ) as FinalizedTransaction;
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connected.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  });

  let providers: ReturnType<typeof buildProviders>;
  try {
    console.log('[step 8] constructing providers object (walletProvider/midnightProvider closures)...');
    providers = buildProviders();
    console.log('[step 8] providers object constructed');
  } catch (err) {
    console.error('[step 8] providers object construction THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let compiledContract;
  try {
    console.log('[step 9] calling CompiledContract.make()...');
    compiledContract = CompiledContract.make(
      'SimpleDAO',
      // The engine-generated Contract class shape differs slightly from compact-js's
      // `Contract` type parameter defaults; numeric context is all that matters here.
      SimpleDaoContract as unknown as never,
    ).pipe(CompiledContract.withVacantWitnesses);
    console.log('[step 9] CompiledContract.make() succeeded');
  } catch (err) {
    console.error('[step 9] CompiledContract.make() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  let deployed: any;
  try {
    console.log('[step 10] calling findDeployedContract() with contractAddress:', contractAddress, '...');
    // `findDeployedContract` returns a richly typed contract wrapper; we narrow it
    // through an `any` boundary into the small surface the UI uses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deployed = (await findDeployedContract(providers as any, {
      compiledContract: compiledContract as never,
      contractAddress,
      initialPrivateState: {},
      privateStateId: PRIVATE_STATE_ID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;
    console.log('[step 10] findDeployedContract() succeeded');
  } catch (err) {
    console.error('[step 10] findDeployedContract() THREW:', err, '| constructor:', err?.constructor?.name, '| message:', (err as Error)?.message);
    console.groupEnd();
    throw err;
  }

  console.groupEnd();

  const readState = async (): Promise<Ledger | null> => {
    const state = await publicDataProvider.queryContractState(contractAddress);
    return state ? ledger(state.data) : null;
  };

  const deployment: DaoDeployment = {
    contractAddress,
    networkId: config.networkId,
    unshieldedAddress,
    callTx: {
      registerMember: (secret) => deployed.callTx.registerMember(secret),
      submitProposal: (title, amount, recipient, deadline, quorum) =>
        deployed.callTx.submitProposal(title, amount, recipient, deadline, quorum),
      vote: (proposalId, choice, secret) => deployed.callTx.vote(proposalId, choice, secret),
      executeProposal: (proposalId) => deployed.callTx.executeProposal(proposalId),
    },
    reads: {
      getProposals: async () => {
        const parsed = await readState();
        if (!parsed) return [];
        const proposals: Proposal[] = [];
        for (const [id, raw] of parsed.proposals) {
          proposals.push({
            id,
            title: raw.title,
            amount: raw.amount,
            recipient: raw.recipient,
            deadline: raw.deadline,
            quorum: raw.quorum,
            yes: raw.yes,
            no: raw.no,
            status: statusToLabel(raw.status),
            recipientsHex: toHex(raw.recipient),
          });
        }
        return proposals.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      },
      getTreasury: async () => (await readState())?.treasury ?? 0n,
      getMemberCount: async () => Number((await readState())?.members.size() ?? 0n),
      isMember: async (commitment) => (await readState())?.members.member(commitment) ?? false,
    },
  };

  cachedDeployment = deployment;
  return deployment;
}

export function getCachedDeployment(): DaoDeployment | null {
  return cachedDeployment;
}