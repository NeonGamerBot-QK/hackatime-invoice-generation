const fs = require("fs");

// Constants
const PAY_PER_HOUR = 13.5;
const ACTIVE_THRESHOLD = 120; // seconds
(async () => {
  // Load heartbeats
  const heartbeats = await fetch(
    "https://hackatime.hackclub.com/api/admin/v1/execute",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HACKATIME_ADMIN_KEY}`,
        "Content-Type": "application/json",
      },
      // IF U HAVE MORE THEN 9999 WHY
      body: JSON.stringify({
        query: `select raw_data from heartbeats where user_id = ${process.env.HACKATIME_ID} AND project = '${process.env.HACKATIME_PROJECT}' LIMIT 99999;`,
      }),
    },
  )
    .then((r) => r.json())
    .then((d) => {
      // console.log(d)
      return d.rows.map((e) => JSON.parse(e.raw_data[1]));
    });

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
})();
