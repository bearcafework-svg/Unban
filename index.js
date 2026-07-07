const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const API = "https://discord.com/api/v10";

const headers = {
  "Authorization": `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json"
};

// ดีเลย์ระหว่างคำขอ กันโดน rate limit
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllBans() {
  let bans = [];
  let after = "0";
  while (true) {
    const res = await fetch(`${API}/guilds/${GUILD_ID}/bans?limit=1000&after=${after}`, { headers });
    if (!res.ok) {
      console.error("ดึงรายชื่อแบนล้มเหลว:", res.status, await res.text());
      break;
    }
    const batch = await res.json();
    if (batch.length === 0) break;
    bans = bans.concat(batch);
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
    await sleep(1000); // เผื่อ rate limit ตอนดึงรายชื่อ
  }
  return bans;
}

async function unbanUser(userId) {
  const res = await fetch(`${API}/guilds/${GUILD_ID}/bans/${userId}`, {
    method: "DELETE",
    headers
  });

  if (res.status === 204) {
    console.log(`✅ ปลดแบนสำเร็จ: ${userId}`);
    return true;
  }

  if (res.status === 429) {
    const data = await res.json();
    const retryAfter = (data.retry_after || 1) * 1000;
    console.log(`⏳ โดน rate limit รอ ${retryAfter}ms แล้วลองใหม่...`);
    await sleep(retryAfter);
    return unbanUser(userId); // ลองใหม่หลังรอ
  }

  console.error(`❌ ปลดแบนไม่สำเร็จ ${userId}:`, res.status, await res.text());
  return false;
}

async function unbanAll() {
  console.log("กำลังดึงรายชื่อสมาชิกที่ถูกแบนทั้งหมด...");
  const bans = await fetchAllBans();
  console.log(`พบทั้งหมด ${bans.length} รายการ`);

  for (let i = 0; i < bans.length; i++) {
    const user = bans[i].user;
    await unbanUser(user.id);
    console.log(`ความคืบหน้า: ${i + 1}/${bans.length}`);
    await sleep(1200); // ดีเลย์ ~1.2 วิ ต่อคน ปลอดภัยจาก rate limit ของ endpoint นี้
  }

  console.log("🎉 ปลดแบนครบทุกคนแล้ว!");
}

unbanAll();
