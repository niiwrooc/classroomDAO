/**
 * interact.js - Скрипт симуляции действий для ClassroomDAO V2.0
 * 
 * Описание: Имитирует действия Преподавателя и Учеников, вызывая события
 *            для проверки работы логгера и дефляционных механик.
 */

const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SGC_ADDRESS = process.env.SGC_TOKEN_ADDRESS;
const XP_ADDRESS = process.env.XP_TOKEN_ADDRESS;
const LOOT_ADDRESS = process.env.LOOT_CONTRACT_ADDRESS;

if (!PRIVATE_KEY || !SGC_ADDRESS || !XP_ADDRESS || !LOOT_ADDRESS) {
    console.error("Ошибка: Убедитесь, что все адреса контрактов и PRIVATE_KEY заполнены в файле .env!");
    process.exit(1);
}

// Минимальные ABI для вызова функций
const SGC_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
];

const XP_ABI = [
    "function mint(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
];

const LOOT_ABI = [
    "function add_item(uint256 item_id, uint256 price, uint256 xp_required) external",
    "function buy_item(uint256 item_id) external",
    "function distribute_loot(address guild_leader, address[] members, uint256 amount) external",
    "function withdraw_from_vault(uint256 amount, address recipient) external",
    "function vault_balances(address leader) external view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const teacherWallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const teacherAddress = await teacherWallet.getAddress();
    
    // Создаем тестового ученика (случайный адрес для теста)
    const studentWallet = ethers.Wallet.createRandom().connect(provider);
    const studentAddress = await studentWallet.getAddress();

    console.log("==================================================");
    console.log("Запуск Симуляции ClassroomDAO V2.0");
    console.log("==================================================");
    console.log(`Преподаватель:   ${teacherAddress}`);
    console.log(`Тестовый Ученик: ${studentAddress}`);
    console.log("==================================================\n");

    // Инициализация контрактов с кошельком Преподавателя
    const sgc = new ethers.Contract(SGC_ADDRESS, SGC_ABI, teacherWallet);
    const xp = new ethers.Contract(XP_ADDRESS, XP_ABI, teacherWallet);
    const loot = new ethers.Contract(LOOT_ADDRESS, LOOT_ABI, teacherWallet);

    // 1. Отправляем тестовому ученику немного монет SGC и ETH для газа
    console.log("Шаг 1: Отправка стартовых SGC и ETH ученику...");
    
    // Перевод ETH для оплаты газа учеником при покупках
    const txEth = await teacherWallet.sendTransaction({
        to: studentAddress,
        value: ethers.parseEther("0.05") // 0.05 ETH (0G)
    });
    await txEth.wait();
    console.log("-> ETH для газа успешно отправлены.");

    // Перевод 500 SGC ученику
    const sgcAmount = ethers.parseUnits("500", 18);
    const txSgc = await sgc.transfer(studentAddress, sgcAmount);
    await txSgc.wait();
    console.log("-> 500 SGC успешно переведены ученику.");

    // 2. Начисление Soulbound опыта (XP) ученику Преподавателем
    console.log("\nШаг 2: Начисление Soulbound XP ученику...");
    const xpAmount = ethers.parseUnits("100", 18); // 100 XP
    const txXp = await xp.mint(studentAddress, xpAmount);
    await txXp.wait();
    console.log(`-> Ученику начислено 100 XP.`);

    // 3. Преподаватель добавляет товар в магазин
    console.log("\nШаг 3: Преподаватель создает товар в магазине...");
    const itemId = 42;
    const price = ethers.parseUnits("200", 18); // Цена: 200 SGC
    const xpRequired = ethers.parseUnits("50", 18); // Требуется: 50 XP
    
    const txAddItem = await loot.add_item(itemId, price, xpRequired);
    await txAddItem.wait();
    console.log(`-> Создан товар №${itemId}: цена ${ethers.formatUnits(price, 18)} SGC, порог ${ethers.formatUnits(xpRequired, 18)} XP.`);

    // 4. Ученик покупает товар (происходит 50/50 дефляция)
    console.log("\nШаг 4: Ученик покупает товар в магазине...");
    
    // Подключаем контракты к кошельку Ученика
    const sgcStudent = sgc.connect(studentWallet);
    const lootStudent = loot.connect(studentWallet);

    // Ученик одобряет контракт Loot на списание 200 SGC
    console.log("-> Ученик одобряет списание SGC контрактом магазина...");
    const txApprove = await sgcStudent.approve(LOOT_ADDRESS, price);
    await txApprove.wait();

    // Ученик совершает покупку
    console.log("-> Отправка транзакции покупки...");
    const txBuy = await lootStudent.buy_item(itemId);
    await txBuy.wait();
    console.log("[УСПЕХ] Товар успешно куплен!");
    console.log("  * 50% (100 SGC) сожжено навсегда (burn).");
    console.log("  * 50% (100 SGC) возвращено Преподавателю на награды.");

    // ================= ДОБАВЛЯЕМ ПАУЗУ ТУТ =================
    console.log("\nЖдем 5 секунд для синхронизации сети 0G...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    // 5. Распределение командного лута (50/50)
    console.log("\nШаг 5: Распределение командной награды (Loot 50/50)...");
    const lootAmount = ethers.parseUnits("300", 18); // 300 SGC всего
    const guildLeader = teacherAddress; // Лидер гильдии
    const guildMembers = [studentAddress]; // Участники гильдии

    // Преподаватель одобряет контракт Loot для распределения
    const txApproveLoot = await sgc.approve(LOOT_ADDRESS, lootAmount);
    await txApproveLoot.wait();

    const txDistribute = await loot.distribute_loot(guildLeader, guildMembers, lootAmount);
    await txDistribute.wait();
    console.log("[УСПЕХ] Награда 300 SGC распределена:");
    console.log("  * 50% (150 SGC) зачислено в сейф (Vault) Лидера.");
    console.log("  * 50% (150 SGC) отправлено напрямую участникам гильдии.");

    // 6. Лидер забирает средства из сейфа (Vault)
    console.log("\nШаг 6: Лидер гильдии выводит 50 SGC из сейфа...");
    const withdrawAmount = ethers.parseUnits("50", 18);
    const txWithdraw = await loot.withdraw_from_vault(withdrawAmount, teacherAddress);
    await txWithdraw.wait();
    console.log("[УСПЕХ] 50 SGC выведены из сейфа на кошелек Лидера.");

    console.log("\n==================================================");
    console.log("Симуляция завершена! Все события отправлены в сеть.");
    console.log("==================================================");
}

main().catch((error) => {
    console.error("Ошибка во время симуляции:", error);
});
