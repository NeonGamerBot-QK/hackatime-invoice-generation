require("dotenv").config();
const fs = require("fs");

// Constants
const LAPSE_USER_ID = process.env.LAPSE_USER_ID || "HuhRJDfr8XGO";
const LAPSE_API_URL = `https://lapse.hackclub.com/api/trpc/timelapse.findByUser?input=%7B%22user%22%3A%22${LAPSE_USER_ID}%22%7D`;

/**
 * Fetches timelapses from the Lapse API.
 * Uses cookies from environment variable for private lapse access.
 * @returns {Promise<Array|null>} Array of timelapse objects or null on failure.
 */
async function fetchLapses() {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add cookies for private lapse access if available
    if (process.env.LAPSE_COOKIES) {
      headers["Cookie"] = process.env.LAPSE_COOKIES;
    } else {
      console.warn("⚠️  LAPSE_COOKIES not set - only public lapses will be fetched");
    }

    const response = await fetch(LAPSE_API_URL, { headers });

    if (!response.ok) {
      console.error(`Lapse API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.result?.data?.ok || !data.result?.data?.data?.timelapses) {
      console.error("Invalid lapse API response structure");
      return null;
    }

    return data.result.data.data.timelapses;
  } catch (err) {
    console.error("Failed to fetch lapses:", err);
    return null;
  }
}

// Constants for invoice generation
const PAY_PER_HOUR = 13.5;

/**
 * Generates an invoice CSV from lapse data.
 * Groups lapses by date and calculates total duration, hours, and pay.
 * @param {Array} lapses - Array of timelapse objects.
 */
function generateInvoice(lapses) {
  // Filter to only include lapses with "ft" or "flavortown" in the name
  const filteredLapses = lapses.filter((lapse) => {
    const name = lapse.name.toLowerCase();
    return name.includes("ft") || name.includes("flavortown");
  });

  console.log(`Filtered to ${filteredLapses.length} lapse(s) matching "ft" or "flavortown"`);

  // Group lapses by date using createdAt timestamp
  const grouped = {};

  filteredLapses.forEach((lapse) => {
    const date = new Date(lapse.createdAt).toISOString().split("T")[0];
    if (!grouped[date]) {
      grouped[date] = { totalSeconds: 0, projects: [], lapseUrls: [] };
    }
    grouped[date].totalSeconds += lapse.duration;
    
    // Track project names for the reason column
    const project = lapse.private?.hackatimeProject || lapse.name;
    if (project && !grouped[date].projects.includes(project)) {
      grouped[date].projects.push(project);
    }

    // Track lapse URLs
    const lapseUrl = `https://lapse.hackclub.com/t/${lapse.id}`;
    grouped[date].lapseUrls.push(lapseUrl);
  });

  const rows = [];
  let grandTotalSeconds = 0;

  for (const date of Object.keys(grouped).sort()) {
    const { totalSeconds, projects, lapseUrls } = grouped[date];
    grandTotalSeconds += totalSeconds;

    const hours = totalSeconds / 3600;
    const pay = +(hours * PAY_PER_HOUR).toFixed(2);
    const reason = projects.join("; ");
    const urls = lapseUrls.join(" ");

    rows.push(`${date},${totalSeconds},${hours.toFixed(2)},${pay.toFixed(2)},${reason},${urls}`);
  }

  // Add total row
  const totalHours = grandTotalSeconds / 3600;
  const totalPay = +(totalHours * PAY_PER_HOUR).toFixed(2);
  rows.push(`Total,${grandTotalSeconds},${totalHours.toFixed(2)},${totalPay.toFixed(2)},,`);

  return `date,total_seconds,hours,pay,reason,lapse_urls\n${rows.join("\n")}`;
}

/**
 * Main entry point - fetches lapses and generates invoice CSV.
 */
(async () => {
  console.log("Fetching lapses...");
  const lapses = await fetchLapses();

  if (!lapses) {
    console.error("Failed to fetch lapses, exiting.");
    process.exit(1);
  }

  console.log(`Found ${lapses.length} lapse(s)`);

  // Save raw lapses for reference
  fs.writeFileSync("./lapses.json", JSON.stringify(lapses, null, 2));
  console.log("Saved raw data to lapses.json");

  // Generate and save invoice CSV
  const csv = generateInvoice(lapses);
  fs.writeFileSync("./invoice_lapse.csv", csv);
  console.log("Saved invoice to invoice_lapse.csv");
})();
