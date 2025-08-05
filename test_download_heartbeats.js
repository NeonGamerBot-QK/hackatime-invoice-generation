require('dotenv/config');
const res = fetch("https://hackatime.hackclub.com/api/admin/v1/execute", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HACKATIME_ADMIN_KEY}`, "Content-Type": "application/json" },
    // IF U HAVE MORE THEN 9999 WHY 
    body: JSON.stringify({ query: `select raw_data from heartbeats where user_id = 41 AND project = 'explorpheus' LIMIT 99999;` }),
}).then(r => r.json()).then(d => {
    console.log(d)
    require('fs').writeFileSync('heartbeats.json', JSON.stringify(d.rows.map(e => JSON.parse(e.raw_data[1])), null, 2), 'utf8');
});