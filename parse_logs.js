const fs = require("fs");

const PAY_PER_HOUR = 13.5;
const INVOICE_FILE = "./invoice.csv";
const LOG_FILE = "./session_logs.txt";

function parseDate(dateStr) {
  // dateStr format: YYYY-MM-DD HH:MM:SS
  // Create Date object assuming local time or UTC?
  // The strings in logs are like "2025-11-22 23:10:38"
  // The ISO string in JS might need "T" and "Z" or just parsing.
  // "2025-11-22 23:10:38".replace(" ", "T") works for ISO-ish.
  return new Date(dateStr.replace(" ", "T"));
}

(async () => {
  if (!fs.existsSync(LOG_FILE)) {
    console.log("No log file found.");
    return;
  }

  const logContent = fs.readFileSync(LOG_FILE, "utf-8");
  const blocks = logContent.split("-------------------------------------");

  const sessionData = {}; // date -> total_seconds

  blocks.forEach((block) => {
    const openMatch = block.match(/OPENED: ([\d-]{10} [\d:]{8})/);
    const closeMatch = block.match(/CLOSED: ([\d-]{10} [\d:]{8})/);

    if (openMatch && closeMatch) {
      const openTime = parseDate(openMatch[1]);
      const closeTime = parseDate(closeMatch[1]);

      const diffSeconds = (closeTime - openTime) / 1000;

      if (diffSeconds >= 0) {
        const dateKey = openMatch[1].split(" ")[0]; // YYYY-MM-DD
        if (!sessionData[dateKey]) {
          sessionData[dateKey] = 0;
        }
        sessionData[dateKey] += diffSeconds;
      }
    }
  });

  let csvData = {};
  let header = "date,total_seconds,hours,pay,reason";

  if (fs.existsSync(INVOICE_FILE)) {
    const fileContent = fs.readFileSync(INVOICE_FILE, "utf-8").trim();
    const lines = fileContent.split("\n");

    if (lines.length > 0) {
      // Check existing header
      const existingHeader = lines[0].split(",");
      // We want to preserve data, but upgrade header if needed.
      // If existing header doesn't have reason, we'll add it to rows.

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("Total,")) continue; // Skip total row for now

        const parts = line.split(",");
        const date = parts[0];
        const totalSeconds = parseFloat(parts[1]);
        // parts[2] is hours, parts[3] is pay
        const reason = parts[4] || ""; // Existing reason or empty

        csvData[date] = {
          totalSeconds: totalSeconds,
          reason: reason,
        };
      }
    }
  }

  // Merge session data
  for (const [date, seconds] of Object.entries(sessionData)) {
    if (csvData[date]) {
      csvData[date].totalSeconds += seconds;
      if (!csvData[date].reason.includes("Log")) {
        csvData[date].reason = csvData[date].reason
          ? csvData[date].reason + "; Log"
          : "Log";
      }
    } else {
      csvData[date] = {
        totalSeconds: seconds,
        reason: "Log",
      };
    }
  }

  // Reconstruct CSV
  const rows = [];
  let grandTotalSeconds = 0;

  const sortedDates = Object.keys(csvData).sort();

  for (const date of sortedDates) {
    const data = csvData[date];
    const seconds = data.totalSeconds;
    const hours = seconds / 3600;
    const pay = hours * PAY_PER_HOUR;

    grandTotalSeconds += seconds;

    rows.push(
      `${date},${seconds},${hours.toFixed(2)},${pay.toFixed(2)},${data.reason}`,
    );
  }

  const totalHours = grandTotalSeconds / 3600;
  const totalPay = totalHours * PAY_PER_HOUR;

  rows.push(
    `Total,${grandTotalSeconds},${totalHours.toFixed(2)},${totalPay.toFixed(2)},`,
  );

  fs.writeFileSync(INVOICE_FILE, `${header}\n${rows.join("\n")}`);
  console.log(`Updated ${INVOICE_FILE}`);
})();
