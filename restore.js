const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const BAD_BOT_ID = "1408738181230100583"; // ID ของบอทที่ต้องการกรอง
const API = "https://discord.com/api/v10";
const headers = { "Authorization": `Bot ${BOT_TOKEN}` };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAuditLogs(actionType) {
  let entries = [];
  let before = null;
  while (true) {
    // เพิ่ม user_id เข้าไปใน Query String เพื่อกรองเฉพาะบอทตัวนี้
    let url = `${API}/guilds/${GUILD_ID}/audit-logs?limit=100&action_type=${actionType}&user_id=${BAD_BOT_ID}`;
    if (before) url += `&before=${before}`;
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("ดึง audit log ล้มเหลว:", res.status, await res.text());
      break;
    }
    const data = await res.json();
    if (!data.audit_log_entries || data.audit_log_entries.length === 0) break;
    
    entries = entries.concat(data.audit_log_entries);
    before = data.audit_log_entries[data.audit_log_entries.length - 1].id;
    
    if (data.audit_log_entries.length < 100) break;
    await sleep(500);
  }
  return entries;
}

async function main() {
  console.log(`=== กำลังดึง Channel/Category ที่ถูกลบโดย ID: ${BAD_BOT_ID} ===`);
  const deleted = await fetchAuditLogs(12); // 12 = CHANNEL_DELETE
  console.log(`พบทั้งหมด: ${deleted.length} รายการ`);

  const parsed = deleted.map(entry => {
    const changes = {};
    (entry.changes || []).forEach(c => changes[c.key] = c.old_value);
    return {
      old_id: entry.target_id,
      name: changes.name || "(ไม่ทราบชื่อ)",
      type: changes.type,
      parent_id: changes.parent_id || null,
      position: changes.position ?? null,
      permission_overwrites: changes.permission_overwrites || [],
      created_at: entry.id
    };
  });

  parsed.forEach(p => {
    console.log(`- [${p.type}] ${p.name} | parent เดิม: ${p.parent_id} | overwrites: ${p.permission_overwrites.length} รายการ`);
  });

  const fs = await import("fs");
  fs.writeFileSync("recovery_data.json", JSON.stringify(parsed, null, 2));
  console.log("\n✅ บันทึกลง recovery_data.json แล้ว");
}

main();
