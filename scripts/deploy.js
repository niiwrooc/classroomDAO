/**
 * deploy.js - Автоматический деплой смарт-контрактов ClassroomDAO V2.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

// Конфигурация из .env
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY || PRIVATE_KEY.startsWith('0x00000000')) {
    console.error("Ошибка: Пожалуйста, укажите ваш реальный PRIVATE_KEY в файле .env перед деплоем!");
    process.exit(1);
}

// Функция компиляции Vyper-контракта через CLI
function compileVyper(contractName) {
    const filePath = path.join(__dirname, '../contracts', `${contractName}.vy`);
    console.log(`Компиляция ${contractName}.vy...`);
    try {
        const abiString = execSync(`vyper -f abi "${filePath}"`).toString().trim();
        let bytecodeString = execSync(`vyper -f bytecode "${filePath}"`).toString().trim();
        
        if (!bytecodeString.startsWith('0x')) {
            bytecodeString = '0x' + bytecodeString;
        }
        
        return {
            abi: JSON.parse(abiString),
            bytecode: bytecodeString
        };
    } catch (error) {
        console.error(`\nОшибка компиляции ${contractName}.vy!`);
        console.error("Убедитесь, что у вас установлен компилятор vyper в терминале (команда: vyper --version).");
        console.error("Чтобы установить его локально, выполните: pip install vyper==0.3.10\n");
        process.exit(1);
    }
}

async function main() {
    // Настройка провайдера и кошелька
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const deployerAddress = await wallet.getAddress();
    
    console.log("==================================================");
    console.log("Деплой ClassroomDAO V2.0 Смарт-Контрактов");
    console.log("==================================================");
    console.log(`Сеть RPC:         ${RPC_URL}`);
    console.log(`Адрес деплоера:   ${deployerAddress}`);
    
    const balance = await provider.getBalance(deployerAddress);
    console.log(`Баланс деплоера:  ${ethers.formatEther(balance)} ETH (0G)`);
    console.log("==================================================\n");

    if (balance === 0n) {
        console.error("Ошибка: Баланс кошелька равен 0. Вам нужны тестовые токены для оплаты газа.");
        console.error("Получить тестовые токены можно в кране (Faucet) 0G Testnet.");
        process.exit(1);
    }

    // 1. Деплой SGC_Token
    const sgcData = compileVyper('SGC_Token');
    console.log("Публикация SGC_Token в сети...");
    const SGCFactory = new ethers.ContractFactory(sgcData.abi, sgcData.bytecode, wallet);
    const sgcContract = await SGCFactory.deploy();
    await sgcContract.waitForDeployment();
    const sgcAddress = await sgcContract.getAddress();
    console.log(`[УСПЕХ] SGC_Token деплоился по адресу: ${sgcAddress}\n`);

    // 2. Деплой Classroom_XP
    const xpData = compileVyper('Classroom_XP');
    console.log("Публикация Classroom_XP в сети...");
    const XPFactory = new ethers.ContractFactory(xpData.abi, xpData.bytecode, wallet);
    const xpContract = await XPFactory.deploy();
    await xpContract.waitForDeployment();
    const xpAddress = await xpContract.getAddress();
    console.log(`[УСПЕХ] Classroom_XP деплоился по адресу: ${xpAddress}\n`);

    // 3. Деплой Loot_50_50
    const lootData = compileVyper('Loot_50_50');
    console.log("Публикация Loot_50_50 в сети...");
    const LootFactory = new ethers.ContractFactory(lootData.abi, lootData.bytecode, wallet);
    const lootContract = await LootFactory.deploy(sgcAddress, xpAddress);
    await lootContract.waitForDeployment();
    const lootAddress = await lootContract.getAddress();
    console.log(`[УСПЕХ] Loot_50_50 деплоился по адресу: ${lootAddress}\n`);

    console.log("==================================================");
    console.log("Все контракты успешно развернуты!");
    console.log("==================================================");
    console.log(`SGC_TOKEN_ADDRESS=${sgcAddress}`);
    console.log(`XP_TOKEN_ADDRESS=${xpAddress}`);
    console.log(`LOOT_CONTRACT_ADDRESS=${lootAddress}`);
    console.log("==================================================");
    console.log("\nПожалуйста, скопируйте эти адреса в ваш файл .env!");
}

main().catch((error) => {
    console.error("Критическая ошибка деплоя:", error);
    process.exit(1);
});
