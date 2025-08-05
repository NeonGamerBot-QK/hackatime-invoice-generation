require('dotenv/config');
const res = fetch("https://hackatime.hackclub.com/api/admin/v1/execute", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HACKATIME_ADMIN_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `select raw_data from heartbeats where user_id = 41 AND project = 'explorpheus'  LIMIT 10;` }),
}).then(r => r.json()).then(d => console.log(d.rows ? d.rows : d));