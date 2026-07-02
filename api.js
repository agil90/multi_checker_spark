// =====================================
// Lightning Checker API
// Version 1.1 Final
// =====================================

const API_BASE = "https://api.sparkscan.io/v1";

/**
 * Ambil data wallet
 */
async function getWallet(address) {

    const response = await fetch(
        `${API_BASE}/address/${address}`
    );

    if (!response.ok) {
        throw new Error("Wallet API Error");
    }

    return await response.json();

}

/**
 * Ambil transaksi terakhir
 */
async function getTransactions(address) {

    const response = await fetch(
        `${API_BASE}/address/${address}/transactions?limit=10`
    );

    if (!response.ok) {
        return [];
    }

    const json = await response.json();

    return json.data || [];

}

/**
 * Check Address
 */
async function checkAddress(address) {

    try {

        const wallet = await getWallet(address);

const tx = await getTransactions(address);

console.log(tx);

const usd = Number(wallet.totalValueUsd || 0);

return {

    success: true,

    address: wallet.sparkAddress || address,

    status: usd > 0 ? "ACTIVE" : "EMPTY",

    usd: usd,

    btcSoft: Number(wallet.balance?.btcSoftBalanceSats || 0),

    btcHard: Number(wallet.balance?.btcHardBalanceSats || 0),

    tokenUsd: Number(wallet.balance?.totalTokenValueUsd || 0),

    transactions: tx

};

    } catch (error) {

        console.error(error);

        return {

            success: false,

            address,

            status: "ERROR",

            usd: 0,

            lastActivity: null

        };

    }

}