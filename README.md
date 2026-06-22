# ClassroomDAO V2.0

Welcome to **ClassroomDAO V2.0**, a decentralized gamification platform for educational classrooms. This repository contains the smart contracts, documentation, and logging scripts for managing student rewards (SGC), achievements/experience (XP), and guild interactions.

## Project Structure

```
├── contracts/
│   ├── SGC_Token.vy        # ERC-20 token representing Student Gold Coin
│   ├── Classroom_XP.vy     # Soulbound Token (SBT) representing Student Experience
│   └── Loot_50_50.vy       # Marketplace & Guild Loot distribution contract
├── scripts/
│   └── upload_logs.js      # Event listener and 0G DA Storage upload script
├── README.md               # General overview
└── TOKENOMICS.md           # Tokenomics rules and design specification
```

## Tokenomics Overview

ClassroomDAO V2.0 is powered by a dual-token economy:
1. **SGC (Student Gold Coin)**:
   - Initial pool of **100,000 SGC** minted to the Teacher's wallet upon deploy.
   - Shop purchases trigger a **50/50 deflationary split**: 50% is burned, and 50% is recycled back to the Teacher's reward wallet.
   - Guild loot follows a **50/50 division**: 50% is split directly among guild members, and 50% goes to the Guild Vault under the manual control of the Guild Leader.
2. **XP (Classroom Experience)**:
   - Soulbound Token (SBT) - cannot be transferred or traded.
   - Serves as the required limit/level threshold for purchasing items in the marketplace.

For a detailed analysis, see [TOKENOMICS.md](TOKENOMICS.md).

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Vyper Compiler (`0.3.x` recommended)
- Ethers.js and 0G Storage SDK:
  ```bash
  npm install ethers @0gfoundation/0g-storage-ts-sdk
  ```

### Smart Contract Deployment
Compile and deploy the Vyper contracts in the following order:
1. Deploy `SGC_Token.vy`
2. Deploy `Classroom_XP.vy`
3. Deploy `Loot_50_50.vy` passing SGC and XP addresses to the constructor.

### Listening to Logs (0G DA Engineer)
Run the log listener to capture smart contract events and prepare/upload JSON logs to the 0G Storage network:
```bash
node scripts/upload_logs.js
```
*Note: Make sure to configure RPC URLs and your wallet private key in the script.*