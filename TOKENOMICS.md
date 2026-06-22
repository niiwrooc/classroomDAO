# ClassroomDAO V2.0 Tokenomics

This document describes the tokenomics model designed for ClassroomDAO V2.0, detailing the distribution, utility, deflation, and progression mechanics of Student Gold Coin (SGC) and Experience (XP) tokens.

---

## 1. Core Tokens

### 1.1 Student Gold Coin (SGC)
* **Type**: ERC-20 Utility Token.
* **Symbol**: SGC
* **Decimals**: 18
* **Purpose**: Used for in-game and in-classroom store purchases, guild contributions, and rewarding students.
* **Emission Control**: Controlled emission mechanism. The initial supply of **100,000 SGC** is minted directly to the Teacher's wallet (deployer address) upon deployment to seed the rewards pool. Future minting is restricted strictly to the Teacher's role.

### 1.2 Classroom Experience (XP)
* **Type**: Soulbound Token (SBT).
* **Symbol**: XP
* **Decimals**: 18
* **Purpose**: Tracks student experience points and progress.
* **Non-Transferability**: XP is permanent and strictly bound to the student's wallet address. Transferring XP to other wallets is disabled (`transfer` and `transferFrom` always revert).
* **Shop Requirement**: XP acts as a level limit for marketplace purchases. A student must hold a minimum amount of XP (level threshold) to buy specific items in the classroom shop.

---

## 2. Tokenomics Mechanics

### 2.1 50/50 Deflationary Store Mechanics
To ensure a sustainable economy and prevent token inflation, SGC transactions in the classroom marketplace follow a **50/50 split**:
1. **50% Burn**: Half of the item's price paid in SGC is permanently destroyed (burned), reducing the total SGC supply and increasing the value of remaining SGC.
2. **50% Recirculation**: The other half is returned to the Teacher's wallet, ensuring a sustainable cycle of SGC rewards for students.

```
                  [ Student Purchases Item ]
                              │
                      ( 100% SGC Price )
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
         [ 50% Burned ]            [ 50% Recirculated ]
         (Permanently destroyed)    (Returned to Teacher)
```

### 2.2 50/50 Guild Loot Distribution
When guilds earn loot or rewards, the distribution is divided equally:
1. **50% Direct Payout**: Half of the SGC reward is split equally and distributed directly to the wallets of active guild members.
2. **50% Guild Vault**: The other half is deposited into the Guild Vault, managed and distributed manually by the Guild Leader for custom rewards, supplies, or strategic actions.
