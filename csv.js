// =========================================
// Lightning Checker
// csv.js
// =========================================

function exportCSV(results){

    if(!results || results.length===0){

        alert("Tidak ada data.");

        return;

    }

    let csv =
"Address,BTC Hard,BTC Soft,USD,Token,Transaction Count\n";

    results.forEach(item=>{

        csv +=
`${item.address},${item.btcHard},${item.btcSoft},${item.usd},${item.token},${item.txCount}\n`;

    });

    const blob =
new Blob([csv],{
type:"text/csv;charset=utf-8;"
});

    const url =
URL.createObjectURL(blob);

    const a =
document.createElement("a");

    a.href = url;

    a.download = "result.csv";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}