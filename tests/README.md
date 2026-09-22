# Test Coverage

This suite uses Vitest against the compiled Compact circuits (no node/proof-server/Docker required).

Covers:
- Circuit logic for `registerMember`, `submitProposal`, `vote`, and `executeProposal`
- Full proposal lifecycle: submit → vote → auto-execute
- Double-vote prevention via nullifiers
- Deadline enforcement (voting closes correctly, execution respects quorum)
- **Privacy guarantee**: private inputs (credentials, individual vote choice) never appear in any ledger output or circuit result

Run with:
\`\`\`bash
npm run test
\`\`\`
