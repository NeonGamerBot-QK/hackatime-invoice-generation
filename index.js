require('dotenv/config');
const fs = require('fs');
const RATE_PER_HOUR = parseFloat(process.env.RATE_PER_HOUR) || 13.5;
const SLACK_ID = process.env.MY_SLACK_ID;

const start = new Date(new Date().getFullYear(), 5, 5); // June 5 (June = 5)
const end = new Date(); // Today

const getHoursForDay = (project, date) => {
  const nextDate = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return fetch(`https://hackatime.hackclub.com/api/v1/users/${SLACK_ID}/stats?features=projects&filter_by_project=${project}&start_date=${date}&end_date=${nextDate}`)
    .then(r => r.text())
    .then(d => {
      try {
        const jd = JSON.parse(d).data;
        return jd.projects[0] ? jd.projects[0].total_seconds : 0;
      } catch (e) {
        console.error(d);
        console.error(e);
        return 0;
      }
    })
    .catch(() => 0);
};

const records = [];

(async () => {
  let totalSeconds = 0;
  const csvLines = ['date,total_seconds,hours,pay'];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const formatted = date.toISOString().split('T')[0];
    const seconds = await getHoursForDay('explorpheus', formatted);
    const hours = seconds / 3600;
    const pay = hours * RATE_PER_HOUR;
    console.log(`📅 ${formatted} - ${seconds} seconds (${hours.toFixed(2)} hours, $${pay.toFixed(2)})`);
    totalSeconds += seconds;
    csvLines.push(`${formatted},${seconds},${hours.toFixed(2)},${pay.toFixed(2)}`);

    await new Promise((r) => setTimeout(r, 1000)); // Rate limit
  }

  const totalHours = totalSeconds / 3600;
  const totalPay = totalHours * RATE_PER_HOUR;

  csvLines.push(`Total,${totalSeconds},${totalHours.toFixed(2)},${totalPay.toFixed(2)}`);
  fs.writeFileSync('invoice.csv', csvLines.join('\n'), 'utf8');

  console.log('✅ CSV invoice written to invoice.csv');
})();
