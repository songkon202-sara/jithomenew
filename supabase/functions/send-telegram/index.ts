import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ส่งรายงานผู้เกินนัด/นัดพรุ่งนี้เข้ากลุ่ม Telegram
// ⚠️ ห้ามส่งเนื้อหาข้อความกลับให้ผู้เรียก — มีรายชื่อผู้ป่วย
// (ปุ่ม "ส่งรายงาน Telegram ตอนนี้" ในแอปใช้ RPC send_overdue_notification แทน ไม่ได้เรียกฟังก์ชันนี้)
Deno.serve(async (_req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: cfg } = await sb
    .from("notification_settings")
    .select("telegram_bot_token,telegram_chat_id,enabled")
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  if (!cfg?.telegram_bot_token) return json({ ok: false, reason: "disabled" });

  const { data } = await sb.rpc("build_notification_message");
  if (!data) return json({ ok: false, reason: "no_data" });

  const res = await fetch(
    "https://api.telegram.org/bot" + cfg.telegram_bot_token + "/sendMessage",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.telegram_chat_id, text: data, parse_mode: "HTML" }),
    }
  );
  const tg = await res.json().catch(() => ({}));

  // ส่งกลับแค่สถานะ ไม่มีเนื้อหาข้อความ
  return json({ ok: !!tg.ok, error: tg.ok ? undefined : tg.description }, tg.ok ? 200 : 502);
});
