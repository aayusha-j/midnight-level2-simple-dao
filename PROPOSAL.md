# Product Proposal

## What is the product, and who uses it?
Simple DAO is a treasury governance dApp for token-holder communities — DAOs, community grant pools, small collectives — who need to decide how to spend a shared treasury without exposing how each individual member voted. Members register once with a private credential, then submit spending proposals and vote yes/no on them. Once a proposal hits quorum and its deadline passes, funds are released automatically. The primary users are DAO members and treasury stewards who want auditable governance without the social and political costs of public voting records (retaliation, vote-buying, peer pressure).

## Why Midnight specifically?
A transparent chain forces an all-or-nothing choice: either every vote is public (enabling coercion, vote-buying, and social pressure) or the whole process is hidden behind a trusted intermediary (defeating the purpose of a DAO). Midnight's zero-knowledge circuits let Simple DAO have both properties at once — the proposal details, treasury balance, and aggregate tally are fully public and auditable, while each member's credential and individual vote choice never touch the chain in readable form. Midnight's `disclose()` primitive and nullifier pattern make it possible to prove "a valid member cast exactly one vote" without revealing who that member is or which way they voted — something a standard EVM-style chain cannot do without a separate off-chain mixing or ZK layer bolted on top.

## Data Model

| Data Point                          | Type              | Disclosed To |
|--------------------------------------|-------------------|--------------|
| Proposal title, amount, recipient    | Public ledger     | Everyone     |
| Voting deadline and quorum threshold | Public ledger     | Everyone     |
| Treasury balance                     | Public ledger     | Everyone     |
| Membership commitment (hash)         | Public ledger     | Everyone     |
| Vote nullifier                       | Public ledger     | Everyone     |
| Aggregate yes/no tally               | Public ledger     | Everyone     |
| Member's 32-byte credential          | Private witness   | No one       |
| Individual yes/no vote choice        | Private witness   | No one       |

## Mainnet Feasibility
Reaching Mainnet by Level 6 is realistic for the core governance flow already built (register, propose, vote, auto-execute), since the contract logic and privacy model don't fundamentally change between Preview and Mainnet — the main work is operational, not architectural. The features flagged as Future Scope (coin-backed treasury with real token transfers, vote-weighting by token balance, delegation, and snapshot membership) represent the gap between "functional demo" and "production-ready DAO," and would need to be built out before real funds are at stake. A formal audit of the Compact circuits is the most important gate before Mainnet, given that a bug in the vote or execution logic could allow double-voting or incorrect fund release.
