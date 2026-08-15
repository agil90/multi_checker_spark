// =========================================
// Lightning Multi Address Checker
// app.js v1.2 - Ready Test
// =========================================

const addressInput = document.getElementById("addressInput");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const startBtn = document.getElementById("startBtn");
const exportBtn = document.getElementById("exportBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const usdTotal = document.getElementById("usdTotal");
const btcTotal = document.getElementById("btcTotal");
const tokenUsd = document.getElementById("tokenUsd");
const hardUsd = document.getElementById("hardUsd");
const hardBtc = document.getElementById("hardBtc");
const tokenCount = document.getElementById("tokenCount");
const resultContainer = document.getElementById("resultContainer");

let results = [];

// Akumulasi khusus transaksi Received berwarna kuning (Received hari ini).
let totalYellowReceivedCount = 0;
let totalYellowReceivedBtc = 0;
let totalYellowReceivedUsd = 0;

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", loadTxtFile);
startBtn.addEventListener("click", startChecking);
exportBtn.addEventListener("click", () => {
    if (!results.length) return alert("Belum ada data.");
    exportCSV(results);
});

function loadTxtFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { addressInput.value = e.target.result; };
    reader.readAsText(file);
}

function resetDashboard() {
    results = [];
    resultContainer.innerHTML = "";
    totalYellowReceivedCount = 0;
    totalYellowReceivedBtc = 0;
    totalYellowReceivedUsd = 0;
    usdTotal.textContent = "$0.00";
    btcTotal.textContent = "0 BTC";
    tokenUsd.textContent = "$0.00";
    hardUsd.textContent = "$0.00 Hard";
    hardBtc.textContent = "0 BTC Hard";
    tokenCount.textContent = "0 Tokens";
    progressBar.style.width = "0%";
    progressText.textContent = "0 / 0";
    exportBtn.disabled = true;
}

async function startChecking() {
    resetDashboard();

    const addresses = addressInput.value
        .split("\n")
        .map(a => a.trim())
        .filter(Boolean);

    if (!addresses.length) {
        alert("Masukkan minimal satu Spark Address.");
        return;
    }

    let checked = 0;
    let totalUsd = 0;
    let totalBtc = 0;
    let totalToken = 0;
    let totalHardBtc = 0;

    startBtn.disabled = true;

    try {
        for (const address of addresses) {
            progressText.textContent = `Checking ${checked + 1} / ${addresses.length}`;

            try {
                const result = await checkAddress(address);
                checked++;

                if (result.success) {
                    results.push(result);
                    totalUsd += Number(result.usd || 0);
                    totalBtc += Number(result.btcSoft || 0) + Number(result.btcHard || 0);
                    totalHardBtc += Number(result.btcHard || 0);
                    totalToken += Number(result.tokenUsd || 0);
                    addRow(result);
                } else {
                    addErrorRow(address);
                }
            } catch (err) {
                console.error(err);
                checked++;
                addErrorRow(address);
            }

            updateDashboard(totalUsd, totalBtc, totalHardBtc, totalToken);
            const percent = (checked / addresses.length) * 100;
            progressBar.style.width = percent + "%";
            progressText.textContent = `${checked} / ${addresses.length}`;
        }
    } finally {
        renderYellowReceivedSummary();
        exportBtn.disabled = results.length === 0;
        startBtn.disabled = false;
    }
}

function updateDashboard(totalUsd, totalBtcSats, totalHardBtcSats, totalToken) {
    usdTotal.textContent = "$" + totalUsd.toFixed(2);
    btcTotal.textContent = (totalBtcSats / 100000000).toFixed(8) + " BTC";
    tokenUsd.textContent = "$" + totalToken.toFixed(2);
    hardUsd.textContent = "$0.00 Hard";
    hardBtc.textContent = (totalHardBtcSats / 100000000).toFixed(8) + " BTC Hard";
    tokenCount.textContent = totalToken > 0 ? "Tokens" : "0 Tokens";
}

function timeAgo(dateString) {
    if (!dateString) return "No transactions";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Unknown";

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function isReceived(tx) {
    const direction = String(tx?.direction || tx?.type || "").toLowerCase();
    return ["received", "receive", "incoming", "in"].includes(direction);
}

function isSent(tx) {
    const direction = String(tx?.direction || tx?.type || "").toLowerCase();
    return ["sent", "send", "outgoing", "out"].includes(direction);
}

function isRecentReceived(tx) {
    if (!isReceived(tx) || !tx?.createdAt) return false;

    const txDate = new Date(tx.createdAt);
    const now = new Date();

    // Kuning = Received pada tanggal hari ini (bukan 24 jam terakhir).
    return txDate.getFullYear() === now.getFullYear() &&
           txDate.getMonth() === now.getMonth() &&
           txDate.getDate() === now.getDate();
}

function displayParty(value, fallback = "-") {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") {
        return value.address || value.sparkAddress || value.id || value.type || fallback;
    }
    return String(value);
}

function getFromTo(tx, walletAddress) {
    const received = isReceived(tx);
    const cp = tx?.counterparty || {};
    const cpValue = displayParty(cp.address || cp.sparkAddress || cp.id || cp.type, "-");
    const wallet = walletAddress || "-";
    return received
        ? { from: cpValue, to: wallet }
        : { from: wallet, to: cpValue };
}

function short(value, length = 10) {
    const s = String(value || "-");
    return s.length > length ? s.slice(0, length) + "..." : s;
}

function addRow(item) {
    const number = results.length - 1;
    const card = document.createElement("div");
    card.className = "wallet-card";

    const transactions = Array.isArray(item.transactions) ? item.transactions : [];
    const address = String(item.address || "-");

    card.innerHTML = `
        <div class="wallet-address">${number + 1}. ${address}</div>
        <div class="tx-table-wrapper">
            <table class="tx-table">
                <thead>
                    <tr>
                        <th>Tx ID</th>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount (BTC)</th>
                        <th>USD</th>
                        <th>Age</th>
                    </tr>
                </thead>
                <tbody id="tx-${number}">
                    <tr><td colspan="7">Loading...</td></tr>
                </tbody>
            </table>
        </div>`;

    resultContainer.appendChild(card);
    const tbody = document.getElementById(`tx-${number}`);
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!transactions.length) {
        tbody.innerHTML = `<tr><td colspan="7">No Transactions</td></tr>`;
        return;
    }

    transactions.slice(0, 2).forEach(tx => {
        const sats = Number(tx.amountSats ?? tx.amount ?? 0);
        const btc = (sats / 100000000).toFixed(8);
        const received = isReceived(tx);
        const sent = isSent(tx);
        const recentReceived = isRecentReceived(tx);
        const { from, to } = getFromTo(tx, address);
        const row = document.createElement("tr");

        // Warna hanya teks di seluruh baris:
        // Received <24 jam = kuning
        // Received >=24 jam = hijau
        // Sent/Outgoing = merah
        if (recentReceived) {
            row.classList.add("tx-received-recent");
        } else if (received) {
            row.classList.add("tx-received-old");
        } else if (sent) {
            row.classList.add("tx-sent");
        }

        // Tampilan Type:
        // incoming -> Received
        // outgoing -> Sent
        const directionText = received ? "Received" : sent ? "Sent" : String(tx.direction || tx.type || "-");

        // Warna teks seluruh isi baris.
        // Received <24 jam = kuning
        // Received >=24 jam = hijau
        // Sent/Outgoing = merah
        const textColor = recentReceived ? "#f2cc60" : received ? "#39d353" : sent ? "#ff4d4d" : "";

        row.innerHTML = `
            <td style="color:${textColor}" title="${String(tx.id || "-")}">${short(tx.id, 12)}</td>
            <td style="color:${textColor}">${directionText}</td>
            <td style="color:${textColor}" title="${from}">${short(from, 14)}</td>
            <td style="color:${textColor}" title="${to}">${short(to, 14)}</td>
            <td style="color:${textColor}">${btc}</td>
            <td style="color:${textColor}">$${Number(tx.valueUsd || 0).toFixed(2)}</td>
            <td class="tx-age" style="color:${textColor} !important">
                ${timeAgo(tx.createdAt)}
                ${recentReceived ? "" : `<br><small style="color:${textColor} !important">${formatDate(tx.createdAt)}</small>`}
            </td>`;

        tbody.appendChild(row);

        // Hanya transaksi Received hari ini (kuning) yang masuk akumulasi.
        if (recentReceived) {
            totalYellowReceivedCount += 1;
            totalYellowReceivedBtc += sats / 100000000;
            totalYellowReceivedUsd += Number(tx.valueUsd || 0);
        }
    });

    renderYellowReceivedSummary();
}

function renderYellowReceivedSummary() {
    let summary = document.getElementById("yellowReceivedSummary");

    if (!summary) {
        summary = document.createElement("div");
        summary.id = "yellowReceivedSummary";
        summary.className = "yellow-summary";
        resultContainer.prepend(summary);
    } else if (summary.parentElement !== resultContainer) {
        resultContainer.prepend(summary);
    }

    summary.innerHTML = `
        <div class="yellow-summary-title">
            <span class="yellow-summary-logo">⚡</span>
            <strong>TOTAL SUMMARY</strong>
        </div>
        <div class="yellow-summary-table">
            <div class="yellow-summary-cell">
                <span>Total Received</span>
                <strong>${totalYellowReceivedCount}</strong>
            </div>
            <div class="yellow-summary-cell">
                <span>Total Received (BTC)</span>
                <strong>${totalYellowReceivedBtc.toFixed(8)} BTC</strong>
            </div>
            <div class="yellow-summary-cell">
                <span>Total Received (USD)</span>
                <strong>$${totalYellowReceivedUsd.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

function addErrorRow(address) {
    const card = document.createElement("div");
    card.className = "wallet-card";
    card.innerHTML = `
        <div class="wallet-header"><div class="wallet-status error">🔴 ERROR</div></div>
        <div class="wallet-address">${address}</div>
        <div class="wallet-grid">
            <div class="wallet-item"><span>Status</span><strong>API Error</strong></div>
        </div>`;
    resultContainer.appendChild(card);
}

// Register the service worker when the page is served from HTTPS/localhost.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch(err => console.warn("Service worker:", err));
    });
}
