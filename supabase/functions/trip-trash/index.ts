import { authorize } from "../_shared/session.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const PEOPLE = ["瑞子", "普子", "航子", "辉子"];
const json = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const {
      action,
      payload = {},
      trip_slug = "chuanxi2026",
    } = await req.json();
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const access = await authorize(db, trip_slug, payload);
    if (!access.ok)
      return json(
        { error: access.error, code: "session_invalid" },
        access.status,
      );

    if (action === "list_trash") {
      const [e, r] = await Promise.all([
        db
          .from("deleted_expenses")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("deleted_at", { ascending: false })
          .limit(100),
        db
          .from("deleted_repayments")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("deleted_at", { ascending: false })
          .limit(100),
      ]);
      if (e.error || r.error)
        return json({ error: e.error?.message || r.error?.message }, 500);
      return json({ expenses: e.data || [], repayments: r.data || [] });
    }
    if (action === "restore_expense") {
      const archiveId = String(payload.archive_id || ""),
        actor = String(payload.actor || "");
      if (!archiveId || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const q = await db
        .from("deleted_expenses")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("archive_id", archiveId)
        .maybeSingle();
      if (q.error) return json({ error: q.error.message }, 500);
      if (!q.data) return json({ error: "已删除账单不存在" }, 404);
      const x = q.data;
      const row = {
        id: x.original_id,
        trip_slug: x.trip_slug,
        category: x.category,
        amount: x.amount,
        note: x.note || "",
        payer: x.payer,
        participants: x.participants,
        settled: !!x.settled,
        status: x.status || "paid",
        created_at: x.original_created_at || new Date().toISOString(),
        receipt_path: null,
        receipt_name: null,
      };
      const ins = await db.from("expenses").insert(row).select().single();
      if (ins.error) return json({ error: ins.error.message }, 500);
      await db.from("deleted_expenses").delete().eq("archive_id", archiveId);
      await db
        .from("activity_logs")
        .insert({
          trip_slug,
          person: actor,
          category: "账本",
          action: "恢复账单",
          detail: `${x.category} ${Number(x.amount).toFixed(2)} 元`,
          metadata: { expense_id: x.original_id },
        });
      return json({ ok: true, row: ins.data });
    }
    if (action === "restore_repayment") {
      const archiveId = String(payload.archive_id || ""),
        actor = String(payload.actor || "");
      if (!archiveId || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const q = await db
        .from("deleted_repayments")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("archive_id", archiveId)
        .maybeSingle();
      if (q.error) return json({ error: q.error.message }, 500);
      if (!q.data) return json({ error: "已删除收付款不存在" }, 404);
      const x = q.data;
      const row = {
        id: x.original_id,
        trip_slug: x.trip_slug,
        from_person: x.from_person,
        to_person: x.to_person,
        amount: x.amount,
        note: x.note || "",
        created_at: x.original_created_at || new Date().toISOString(),
      };
      const ins = await db.from("repayments").insert(row).select().single();
      if (ins.error) return json({ error: ins.error.message }, 500);
      await db.from("deleted_repayments").delete().eq("archive_id", archiveId);
      await db
        .from("activity_logs")
        .insert({
          trip_slug,
          person: actor,
          category: "账本",
          action: "恢复收付款",
          detail: `${x.from_person} → ${x.to_person} ${Number(x.amount).toFixed(2)} 元`,
          metadata: { repayment_id: x.original_id },
        });
      return json({ ok: true, row: ins.data });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
