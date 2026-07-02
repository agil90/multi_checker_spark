// =========================================
// Lightning Multi Address Checker
// app.js v1.1 Final
// =========================================

// ===== ELEMENT =====

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

const resultContainer =
document.getElementById("resultContainer");

// ===============================

let results = [];

// ===============================
// Event
// ===============================

uploadBtn.addEventListener("click", () => {

    fileInput.click();

});

fileInput.addEventListener("change", loadTxtFile);

startBtn.addEventListener("click", startChecking);

exportBtn.addEventListener("click", () => {

    if(results.length===0){

        alert("Belum ada data.");

        return;

    }

    exportCSV(results);

});

// ===============================
// Load TXT
// ===============================

function loadTxtFile(event){

    const file = event.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(e){

        addressInput.value = e.target.result;

    }

    reader.readAsText(file);

}

// ===============================
// Reset Dashboard
// ===============================

function resetDashboard(){

    results=[];

    resultContainer.innerHTML="";

    usdTotal.textContent="$0.00";
    btcTotal.textContent="0 BTC";
    tokenUsd.textContent="$0.00";
    hardUsd.textContent="$0.00 Hard";
    hardBtc.textContent="0 BTC Hard";
    tokenCount.textContent="0 Tokens";

    progressBar.style.width="0%";

    progressText.textContent="0 / 0";

    exportBtn.disabled=true;

}
// ===============================
// Start Checking
// ===============================

async function startChecking() {

    resetDashboard();

    const addresses = addressInput.value
        .split("\n")
        .map(a => a.trim())
        .filter(a => a.length > 0);

    if (addresses.length === 0) {

        alert("Masukkan minimal satu Spark Address.");

        return;

    }

    let checked = 0;
let active = 0;

let totalUsd = 0;
let totalBtc = 0;
let totalToken = 0;

    startBtn.disabled = true;

    for (const address of addresses) {

        progressText.textContent =
            `Checking ${checked + 1} / ${addresses.length}`;

        try {

            const result = await checkAddress(address);

            checked++;

            if (result.success) {

                results.push(result);

                if (result.status === "ACTIVE") {

                    active++;

                }

                totalUsd += Number(result.usd || 0);

totalBtc += Number(result.btcSoft || 0);
totalBtc += Number(result.btcHard || 0);

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

        usdTotal.textContent = "$" + totalUsd.toFixed(2);
        btcTotal.textContent = (totalBtc/100000000).toFixed(8)+" BTC";
        tokenUsd.textContent = "$"+totalToken.toFixed(2);
        hardUsd.textContent = "$0.00 Hard";
        hardBtc.textContent = ((totalBtc/100000000).toFixed(8))+" BTC Hard";
        tokenCount.textContent = totalToken>0 ? "1 Tokens":"0 Tokens";

        const percent =
            (checked / addresses.length) * 100;

        progressBar.style.width =
            percent + "%";

        progressText.textContent =
            checked + " / " + addresses.length;

    }

    exportBtn.disabled = false;

    startBtn.disabled = false;

}
// ===============================
// Wallet Card
// ===============================
function timeAgo(dateString){

    if (!dateString) return "No transactions";

    const now = new Date();
    const date = new Date(dateString);

    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
    if (hours < 24) return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
    if (days < 30) return days + " day" + (days > 1 ? "s" : "") + " ago";

    return date.toLocaleDateString();
}

function formatDate(dateString){

    if(!dateString) return "-";

    const d = new Date(dateString);

    const day = String(d.getDate()).padStart(2,"0");
    const month = String(d.getMonth()+1).padStart(2,"0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

function addRow(item) {const number = results.length;

    const card = document.createElement("div");

    let statusClass = "empty";
    let statusIcon = "🟡";

    if (item.status === "ACTIVE") {

        statusClass = "active";
        statusIcon = "🟢";

    } else if (item.status === "ERROR") {

        statusClass = "error";
        statusIcon = "🔴";

    }

    const transactions = item.transactions || [];

    card.className = "wallet-card";

    card.innerHTML = `

<div class="wallet-header">

<div class="wallet-status">
</div>

</div>

<div class="wallet-address">

${number}. ${item.address}

</div>

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

<tr>

<td colspan="7">Loading...</td>

</tr>

</tbody>

</table>

</div>

`;

    resultContainer.appendChild(card);

const tbody = document.getElementById(`tx-${number}`);

if (!tbody) return;

tbody.innerHTML = "";

if (transactions.length === 0) {

    tbody.innerHTML = `
        <tr>
            <td colspan="7">No Transactions</td>
        </tr>
    `;

    return;
}

transactions.slice(0, 2).forEach(tx => {

    const btc = (Number(tx.amountSats || 0) / 100000000).toFixed(8);

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${tx.id.substring(0,8)}...</td>
        <td>
${
tx.direction === "incoming"
? '<span style="color:#2ea043;font-weight:bold;">Receive</span>'
: '<span style="color:#f85149;font-weight:bold;">Sent</span>'
}
</td>
        <td>${tx.counterparty?.type || "-"}</td>
        <td>${item.address.substring(0,10)}...</td>
        <td class="${tx.direction}">
${btc}
</td>

<td class="${tx.direction}">
$${Number(tx.valueUsd || 0).toFixed(2)}
</td>
        <td>
    ${timeAgo(tx.createdAt)}
    <br>
    <small>${formatDate(tx.createdAt)}</small>
</td>
    `;

    tbody.appendChild(row);

});

}

// ===============================
// Error Card
// ===============================

function addErrorRow(address){

    const card = document.createElement("div");

    card.className = "wallet-card";

    card.innerHTML = `

<div class="wallet-header">

    <div class="wallet-status error">

        🔴 ERROR

    </div>

</div>

<div class="wallet-address">

${address}

</div>

<div class="wallet-grid">

    <div class="wallet-item">

        <span>Status</span>

        <strong>API Error</strong>

    </div>

</div>

`;

    resultContainer.appendChild(card);

}