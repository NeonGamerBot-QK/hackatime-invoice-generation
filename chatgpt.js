const fs = require("fs");

// Constants
const PAY_PER_HOUR = 13.5;
const ACTIVE_THRESHOLD = 120; // seconds

// Load heartbeats
const heartbeats = JSON.parse(fs.readFileSync("./heartbeats.json", "utf-8"));

// Group by date
const grouped = {};
heartbeats
  .sort((a, b) => a.time - b.time)
  .forEach((hb) => {
    const date = new Date(hb.time * 1000).toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(hb.time);
  });

const rows = [];
let grandTotalSeconds = 0;

for (const date of Object.keys(grouped).sort()) {
  const times = grouped[date];
  let totalSeconds = 0;

  for (let i = 0; i < times.length; i++) {
    const current = times[i];
    const next = times[i + 1];
    if (next) {
      const diff = next - current;
      totalSeconds += Math.min(diff, ACTIVE_THRESHOLD);
    } else {
      totalSeconds += ACTIVE_THRESHOLD; // last heartbeat of the day
    }
  }

  grandTotalSeconds += totalSeconds;
  const hours = totalSeconds / 3600;
  const pay = +(hours * PAY_PER_HOUR).toFixed(2);
  rows.push(`${date},${totalSeconds},${hours.toFixed(2)},${pay.toFixed(2)},`);
}

// Add total row
const totalHours = grandTotalSeconds / 3600;
const totalPay = +(totalHours * PAY_PER_HOUR).toFixed(2);
rows.push(
  `Total,${grandTotalSeconds},${totalHours.toFixed(2)},${totalPay.toFixed(2)},`,
);

// Save
fs.writeFileSync(
  "./invoice_ai.csv",
  `date,total_seconds,hours,pay,reason\n${rows.join("\n")}`,
);
console.log("Saved to invoice.csv");
