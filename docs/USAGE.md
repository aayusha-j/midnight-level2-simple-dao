# How to Use Simple DAO

Simple DAO lets a group of members decide together how to spend a shared treasury. Everyone can see the proposals and the final vote count, but nobody can see who voted or which way they voted.

## What You Need

- A Chrome-based browser
- The 1AM or Lace wallet extension, switched to the Midnight **Preview** network
- A little test NIGHT in your wallet (from the Preview faucet)
- The live app link from the README

## Step-by-Step Guide

1. Open the live app and click **Connect Wallet**. Approve the request in your wallet. Your shortened wallet address appears at the top.
2. Click **Call circuit** to register as a DAO member. Your wallet creates a proof in your browser, then asks you to approve the transaction. Wait for the "Transaction submitted on-chain" message.
3. To create a proposal, fill in the title, amount, recipient (64 hex characters), voting period in days, and the quorum (minimum yes votes). Click **Submit proposal** and approve in your wallet.
4. Find your proposal in the Proposals list. Choose **Yes** or **No** and click **Vote**. Approve the transaction in your wallet.
5. Watch the yes/no tally update. Only the totals change. Your choice is not shown anywhere.
6. After the deadline passes, click **Execute (or reject) proposal**. It is executed if it reached quorum and has more yes than no votes. Otherwise it is rejected.
7. Click **Disconnect** when you are done.

## What Gets Proved (and What Stays Private)

- **Proved:** you are a registered member, and you voted only once on a proposal.
- **Public:** proposal details, treasury balance, member commitments (hashes), vote nullifiers, and the yes/no totals.
- **Private:** your membership credential and your yes/no choice. They exist only inside the proof made in your browser and are never stored on-chain.

Every private action in the app is labeled "Proved without revealing your input."

## Troubleshooting

- **Wallet not detected:** install 1AM or Lace, then refresh the page.
- **Nothing happens after connecting:** make sure the wallet is on the Preview network.
- **"Proving locally..." takes a while:** this is normal. Proofs are generated in your browser and can take a short time.
- **"Already voted" or a vote is rejected:** each member can vote once per proposal. This is the double-vote protection working.
- **Wallet popup error or no popup appears:** refresh the page, reconnect the wallet, and try again.
- **Vote button missing:** voting has closed for that proposal. Use Execute instead.
