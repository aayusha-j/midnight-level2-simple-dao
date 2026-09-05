import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProposal(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 amount_0: bigint,
                 recipient_0: Uint8Array,
                 deadline_0: bigint,
                 quorum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       choice_0: boolean,
       secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  executeProposal(context: __compactRuntime.CircuitContext<PS>,
                  proposalId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProposal(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 amount_0: bigint,
                 recipient_0: Uint8Array,
                 deadline_0: bigint,
                 quorum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       choice_0: boolean,
       secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  executeProposal(context: __compactRuntime.CircuitContext<PS>,
                  proposalId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerMember(context: __compactRuntime.CircuitContext<PS>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProposal(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 amount_0: bigint,
                 recipient_0: Uint8Array,
                 deadline_0: bigint,
                 quorum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       choice_0: boolean,
       secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  executeProposal(context: __compactRuntime.CircuitContext<PS>,
                  proposalId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly nextProposalId: bigint;
  proposals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { title: string,
                             amount: bigint,
                             recipient: Uint8Array,
                             deadline: bigint,
                             quorum: bigint,
                             yes: bigint,
                             no: bigint,
                             status: number
                           };
    [Symbol.iterator](): Iterator<[bigint, { title: string,
  amount: bigint,
  recipient: Uint8Array,
  deadline: bigint,
  quorum: bigint,
  yes: bigint,
  no: bigint,
  status: number
}]>
  };
  members: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  votesCast: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly treasury: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               seedTreasury_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
