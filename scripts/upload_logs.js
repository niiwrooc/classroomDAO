/**
 * upload_logs.js - 0G DA Log Listener and Uploader
 * 
 * Role: 0G DA Engineer
 * Description: Listens to events emitted by ClassroomDAO V2.0 contracts,
 *              formats them as JSON logs, and uploads them to the 0G decentralized storage.
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Import 0G TS SDK gracefully
let ZgSdk;
try {
    ZgSdk = require('@0gfoundation/0g-storage-ts-sdk');
} catch (e) {
    console.warn("\x1b[33m%s\x1b[0m", "WARNING: '@0gfoundation/0g-storage-ts-sdk' is not installed.");
    console.warn("Run: 'npm install @0gfoundation/0g-storage-ts-sdk ethers' to enable full functionality.");
    console.warn("0G Storage uploads will run in DRY-RUN mode until libraries are installed.\n");
}

// ==========================================
// 1. Configuration
// ==========================================
const CONFIG = {
    // 0G Chain and Storage RPCs (Testnet)
    evmRpc: process.env.EVM_RPC || 'https://evmrpc-testnet.0g.ai',
    indexerRpc: process.env.INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai',
    
    // Wallet Credentials (must have 0G tokens on testnet to pay gas and storage fees)
    privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    
    // Deployed Smart Contract Addresses
    contracts: {
        sgcToken: process.env.SGC_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000001',
        classroomXp: process.env.XP_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000002',
        lootContract: process.env.LOOT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000003'
    },
    
    // Log settings
    logFileName: 'classroom_da_logs.jsonl',
    uploadThreshold: 5 // number of logs before triggering a 0G DA upload
};

const LOG_FILE_PATH = path.join(__dirname, CONFIG.logFileName);
let logBufferCount = 0;

// ABIs representing the contract events we want to listen to
const SGC_ABI = [
    "event Transfer(address indexed sender, address indexed receiver, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

const XP_ABI = [
    "event Transfer(address indexed sender, address indexed receiver, uint256 value)"
];

const LOOT_ABI = [
    "event ItemAdded(uint256 indexed item_id, uint256 price, uint256 xp_required)",
    "event ItemPurchased(address indexed buyer, uint256 indexed item_id, uint256 price, uint256 burned, uint256 recycled)",
    "event LootDistributed(address indexed guild_leader, uint256 total_amount, uint256 vault_share, uint256 members_count, uint256 share_per_member)",
    "event VaultWithdrawal(address indexed leader, address indexed recipient, uint256 amount)"
];

// Helper to extract metadata from event objects across different Ethers.js versions
function getEventMetadata(eventObj) {
    if (!eventObj) return { blockNumber: 0, transactionHash: '0x0' };
    const blockNumber = eventObj.blockNumber || (eventObj.log && eventObj.log.blockNumber) || 0;
    const transactionHash = eventObj.transactionHash || (eventObj.log && eventObj.log.transactionHash) || '0x0';
    return { blockNumber, transactionHash };
}

// ==========================================
// 2. Logging and 0G Storage Logic
// ==========================================
async function recordLog(contractName, eventName, args, rawEvent) {
    const meta = getEventMetadata(rawEvent);
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        contract: contractName,
        eventName: eventName,
        blockNumber: meta.blockNumber,
        transactionHash: meta.transactionHash,
        args: args
    };

    console.log(`[NEW EVENT] ${contractName} -> ${eventName} | Tx: ${meta.transactionHash.substring(0, 10)}...`);
    
    // Append to local JSONL (JSON Lines) file
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
    logBufferCount++;
    
    // If the threshold is reached, upload the buffer to 0G DA Storage
    if (logBufferCount >= CONFIG.uploadThreshold) {
        console.log(`\n[0G DA] Log buffer reached threshold (${CONFIG.uploadThreshold} logs). Preparing upload...`);
        logBufferCount = 0;
        await uploadLogsTo0G();
    }
}

async function uploadLogsTo0G() {
    if (!fs.existsSync(LOG_FILE_PATH)) {
        console.log("[0G DA] No log file found to upload.");
        return;
    }

    // Create a snapshot for upload, allowing current logging to continue uninterrupted
    const uploadFilePath = path.join(__dirname, `logs_upload_${Date.now()}.jsonl`);
    fs.renameSync(LOG_FILE_PATH, uploadFilePath);

    console.log(`[0G DA] Snapshot created: ${path.basename(uploadFilePath)}`);

    if (!ZgSdk) {
        console.log("[0G DA] [DRY-RUN] 0G SDK not loaded. Log file remains saved locally.");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.evmRpc);
        const signer = new ethers.Wallet(CONFIG.privateKey, provider);
        const indexer = new ZgSdk.Indexer(CONFIG.indexerRpc);

        console.log(`[0G DA] Connecting to 0G Indexer: ${CONFIG.indexerRpc}`);
        const file = await ZgSdk.ZgFile.fromFilePath(uploadFilePath);
        
        console.log("[0G DA] Submitting file to 0G Storage Nodes...");
        const [tx, err] = await indexer.upload(file, CONFIG.evmRpc, signer);

        if (err === null) {
            console.log(`\x1b[32m%s\x1b[0m`, `[0G DA] Upload Successful! Transaction Hash: ${tx}`);
            // Clean up the uploaded snapshot after a successful upload
            fs.unlinkSync(uploadFilePath);
        } else {
            console.error("[0G DA] Upload failed with error:", err);
            // Restore snapshot
            fs.appendFileSync(LOG_FILE_PATH, fs.readFileSync(uploadFilePath));
            fs.unlinkSync(uploadFilePath);
        }
        await file.close();
    } catch (error) {
        console.error("[0G DA] Error during upload workflow:", error);
        // Restore snapshot back to main log file
        if (fs.existsSync(uploadFilePath)) {
            fs.appendFileSync(LOG_FILE_PATH, fs.readFileSync(uploadFilePath));
            fs.unlinkSync(uploadFilePath);
        }
    }
}

// ==========================================
// 3. Smart Contract Event Listeners Setup
// ==========================================
async function main() {
    console.log("==================================================");
    console.log("ClassroomDAO V2.0 - 0G DA Log Listener Service");
    console.log("==================================================");
    console.log(`EVM RPC:        ${CONFIG.evmRpc}`);
    console.log(`0G Indexer:     ${CONFIG.indexerRpc}`);
    console.log(`SGC Address:    ${CONFIG.contracts.sgcToken}`);
    console.log(`XP Address:     ${CONFIG.contracts.classroomXp}`);
    console.log(`Loot Address:   ${CONFIG.contracts.lootContract}`);
    console.log("==================================================");

    const provider = new ethers.JsonRpcProvider(CONFIG.evmRpc);

    // Initialise Contract Instances
    const sgcContract = new ethers.Contract(CONFIG.contracts.sgcToken, SGC_ABI, provider);
    const xpContract = new ethers.Contract(CONFIG.contracts.classroomXp, XP_ABI, provider);
    const lootContract = new ethers.Contract(CONFIG.contracts.lootContract, LOOT_ABI, provider);

    console.log("Subscribing to smart contract events...");

    // 1. SGC Token Events
    sgcContract.on("Transfer", (sender, receiver, value, event) => {
        recordLog("SGC_Token", "Transfer", {
            sender,
            receiver,
            value: value.toString()
        }, event);
    });

    sgcContract.on("Approval", (owner, spender, value, event) => {
        recordLog("SGC_Token", "Approval", {
            owner,
            spender,
            value: value.toString()
        }, event);
    });

    // 2. Classroom XP Events
    xpContract.on("Transfer", (sender, receiver, value, event) => {
        // For Soulbound Token, Transfer event represents Minting (sender is 0) or Burning (receiver is 0)
        const type = (sender === ethers.ZeroAddress || sender === '0x0000000000000000000000000000000000000000') ? 'Mint' : 'Burn';
        recordLog("Classroom_XP", `Transfer (${type})`, {
            sender,
            receiver,
            value: value.toString()
        }, event);
    });

    // 3. Loot & Marketplace Events
    lootContract.on("ItemAdded", (item_id, price, xp_required, event) => {
        recordLog("Loot_50_50", "ItemAdded", {
            item_id: item_id.toString(),
            price: price.toString(),
            xp_required: xp_required.toString()
        }, event);
    });

    lootContract.on("ItemPurchased", (buyer, item_id, price, burned, recycled, event) => {
        recordLog("Loot_50_50", "ItemPurchased", {
            buyer,
            item_id: item_id.toString(),
            price: price.toString(),
            burned: burned.toString(),
            recycled: recycled.toString()
        }, event);
    });

    lootContract.on("LootDistributed", (guild_leader, total_amount, vault_share, members_count, share_per_member, event) => {
        recordLog("Loot_50_50", "LootDistributed", {
            guild_leader,
            total_amount: total_amount.toString(),
            vault_share: vault_share.toString(),
            members_count: members_count.toString(),
            share_per_member: share_per_member.toString()
        }, event);
    });

    lootContract.on("VaultWithdrawal", (leader, recipient, amount, event) => {
        recordLog("Loot_50_50", "VaultWithdrawal", {
            leader,
            recipient,
            amount: amount.toString()
        }, event);
    });

    console.log("Listening for events... Press Ctrl+C to stop.");
    
    // Keep process alive
    process.stdin.resume();
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error("Critical error in listener process:", error);
        process.exit(1);
    });
}
