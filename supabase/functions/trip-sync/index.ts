import { authorize } from "../_shared/session.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const PEOPLE = ["瑞子", "普子", "航子", "辉子"];
function fileData(s: string) {
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("invalid file");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}
function validPeople(arr: any) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((x) => PEOPLE.includes(String(x)))
  );
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json();
    const { action, payload = {}, trip_slug = "chuanxi2026" } = body || {};
    if (!action) return json({ error: "missing action" }, 400);
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

    const log = async (
      person: string,
      category: string,
      actionText: string,
      detail = " ",
      metadata: any = {},
    ) => {
      if (!PEOPLE.includes(person)) return;
      await db
        .from("activity_logs")
        .insert({
          trip_slug,
          person,
          category,
          action: actionText,
          detail,
          metadata,
        });
    };
    if (action === "get_state") {
      const [
        expenses,
        repayments,
        people,
        state,
        milestones,
        memories,
        parking,
        bookings,
        emergency,
        prefs,
        profiles,
        logs,
        acks,
      ] = await Promise.all([
        db
          .from("expenses")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("created_at", { ascending: true }),
        db
          .from("repayments")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("created_at", { ascending: true }),
        db.from("person_positions").select("*").eq("trip_slug", trip_slug),
        db
          .from("trip_state")
          .select("*")
          .eq("trip_slug", trip_slug)
          .maybeSingle(),
        db
          .from("milestones")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("achieved_at", { ascending: true }),
        db
          .from("memories")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("created_at", { ascending: false }),
        db
          .from("parking_position")
          .select("*")
          .eq("trip_slug", trip_slug)
          .maybeSingle(),
        db
          .from("bookings")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("created_at", { ascending: true }),
        db
          .from("emergency_contacts")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("kind", { ascending: true }),
        db
          .from("trip_preferences")
          .select("*")
          .eq("trip_slug", trip_slug)
          .maybeSingle(),
        db.from("profiles").select("*").eq("trip_slug", trip_slug),
        db
          .from("activity_logs")
          .select("*")
          .eq("trip_slug", trip_slug)
          .order("created_at", { ascending: false })
          .limit(250),
        db
          .from("ledger_acknowledgements")
          .select("*")
          .eq("trip_slug", trip_slug),
      ]);
      for (const x of [
        expenses,
        repayments,
        people,
        state,
        milestones,
        memories,
        parking,
        bookings,
        emergency,
        prefs,
        profiles,
        logs,
        acks,
      ])
        if (x.error) return json({ error: x.error.message }, 500);
      const expenseOut = [];
      for (const e of expenses.data || []) {
        let receipt_url = null;
        if (e.receipt_path) {
          const { data: s } = await db.storage
            .from("trip-docs")
            .createSignedUrl(e.receipt_path, 3600);
          receipt_url = s?.signedUrl || null;
        }
        expenseOut.push({ ...e, receipt_url });
      }
      const memOut = [];
      for (const m of memories.data || []) {
        const { data: s } = await db.storage
          .from("trip-memories")
          .createSignedUrl(m.storage_path, 3600);
        memOut.push({ ...m, url: s?.signedUrl || null });
      }
      const bookingOut = [];
      for (const b of bookings.data || []) {
        let url = null;
        if (b.storage_path) {
          const { data: s } = await db.storage
            .from("trip-docs")
            .createSignedUrl(b.storage_path, 3600);
          url = s?.signedUrl || null;
        }
        bookingOut.push({ ...b, url });
      }
      const profileOut = [];
      for (const p of profiles.data || []) {
        let avatar_url = p.avatar_data || null;
        if (!avatar_url && p.avatar_path) {
          const pub = db.storage
            .from("trip-avatars")
            .getPublicUrl(p.avatar_path);
          avatar_url =
            (pub.data?.publicUrl || "") +
            (p.updated_at
              ? `?v=${encodeURIComponent(String(p.updated_at))}`
              : "");
        }
        const { avatar_data, ...rest } = p;
        profileOut.push({ ...rest, avatar_url });
      }
      return json({
        expenses: expenseOut,
        repayments: repayments.data,
        person_positions: people.data,
        trip_state: state.data,
        milestones: milestones.data,
        memories: memOut,
        parking: parking.data,
        bookings: bookingOut,
        emergency_contacts: emergency.data,
        preferences: prefs.data,
        profiles: profileOut,
        logs: logs.data,
        ledger_acks: acks.data,
      });
    }
    if (action === "heartbeat") {
      const person = String(payload.person || "");
      if (!PEOPLE.includes(person))
        return json({ error: "invalid person" }, 400);
      const { data, error } = await db
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, row: data });
    }
    if (action === "update_profile") {
      const person = String(payload.person || "");
      if (!PEOPLE.includes(person))
        return json({ error: "invalid person" }, 400);
      const nickname =
        String(payload.nickname || person)
          .trim()
          .slice(0, 20) || person;
      const role =
        payload.role == null
          ? undefined
          : String(payload.role).trim().slice(0, 80);
      const patch: any = {
        nickname,
        updated_by: person,
        updated_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      };
      if (role !== undefined) patch.role = role;
      const { data, error } = await db
        .from("profiles")
        .update(patch)
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      await log(person, "资料", "修改个人资料", `昵称更新为「${nickname}」`, {
        nickname,
      });
      return json({ ok: true, row: data });
    }
    if (action === "upload_avatar") {
      const person = String(payload.person || "");
      if (!PEOPLE.includes(person))
        return json({ error: "invalid person" }, 400);
      const raw = String(payload.data_url || "");
      const { mime, bytes } = fileData(raw);
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        return json({ error: "仅支持 JPG、PNG、WEBP 图片" }, 400);
      if (bytes.byteLength > 1048576)
        return json({ error: "头像压缩后仍超过 1MB，请换一张图片" }, 413);
      const ext =
        mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const old = await db
        .from("profiles")
        .select("avatar_path")
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .single();
      const path = `${trip_slug}/avatars/${person}.${ext}`;
      const up = await db.storage
        .from("trip-avatars")
        .upload(path, bytes, {
          contentType: mime,
          upsert: true,
          cacheControl: "0",
        });
      if (up.error) return json({ error: up.error.message }, 500);
      if (old.data?.avatar_path && old.data.avatar_path !== path)
        await db.storage.from("trip-avatars").remove([old.data.avatar_path]);
      const now = new Date().toISOString();
      const upd = await db
        .from("profiles")
        .update({
          avatar_path: path,
          avatar_data: null,
          updated_by: person,
          updated_at: now,
          last_seen: now,
        })
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .select()
        .single();
      if (upd.error) return json({ error: upd.error.message }, 500);
      await log(person, "资料", "更新头像", "更换了个人头像");
      const pub = db.storage.from("trip-avatars").getPublicUrl(path);
      const avatar_url =
        (pub.data?.publicUrl || "") + `?v=${encodeURIComponent(now)}`;
      return json({ ok: true, row: { ...upd.data, avatar_url } });
    }
    if (action === "add_expense") {
      const payer = String(payload.payer || ""),
        actor = String(payload.actor || payer);
      if (!PEOPLE.includes(payer)) return json({ error: "invalid payer" }, 400);
      const participants = validPeople(payload.participants)
        ? payload.participants.map(String)
        : PEOPLE;
      const row = {
        trip_slug,
        category: String(payload.category || "其他"),
        amount: Number(payload.amount || 0),
        note: String(payload.note || ""),
        payer,
        participants,
        settled: !!payload.settled,
        status: String(payload.status || "paid"),
      };
      if (!(row.amount > 0)) return json({ error: "amount must be > 0" }, 400);
      const { data, error } = await db
        .from("expenses")
        .insert(row)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      if (
        PEOPLE.includes(actor) &&
        actor !== payer &&
        participants.includes(actor)
      )
        await db
          .from("ledger_acknowledgements")
          .upsert(
            {
              trip_slug,
              item_type: "expense",
              item_id: data.id,
              person: actor,
              acked_at: new Date().toISOString(),
            },
            { onConflict: "trip_slug,item_type,item_id,person" },
          );
      await log(
        PEOPLE.includes(actor) ? actor : payer,
        "账本",
        "新增花销",
        `${row.category} ${row.amount.toFixed(2)} 元 · ${row.note || "无备注"}`,
        {
          expense_id: data.id,
          amount: row.amount,
          category: row.category,
          payer,
          participants,
        },
      );
      return json({ ok: true, row: data });
    }
    if (action === "update_expense") {
      const id = String(payload.id || ""),
        actor = String(payload.actor || "");
      if (!id || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const old = await db
        .from("expenses")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      if (!old.data) return json({ error: "账单不存在" }, 404);
      const payer =
          payload.payer == null ? old.data.payer : String(payload.payer),
        participants =
          payload.participants == null
            ? old.data.participants
            : payload.participants.map(String),
        amount =
          payload.amount == null
            ? Number(old.data.amount)
            : Number(payload.amount);
      if (
        !PEOPLE.includes(payer) ||
        !validPeople(participants) ||
        !(amount > 0)
      )
        return json({ error: "账单内容不合法" }, 400);
      const patch = {
        category:
          payload.category == null
            ? old.data.category
            : String(payload.category),
        amount,
        note: payload.note == null ? old.data.note || "" : String(payload.note),
        payer,
        participants,
        status:
          payload.status == null ? old.data.status : String(payload.status),
      };
      const upd = await db
        .from("expenses")
        .update(patch)
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .select()
        .single();
      if (upd.error) return json({ error: upd.error.message }, 500);
      await db
        .from("ledger_acknowledgements")
        .delete()
        .eq("trip_slug", trip_slug)
        .eq("item_type", "expense")
        .eq("item_id", id);
      if (actor !== payer && participants.includes(actor))
        await db
          .from("ledger_acknowledgements")
          .upsert(
            {
              trip_slug,
              item_type: "expense",
              item_id: id,
              person: actor,
              acked_at: new Date().toISOString(),
            },
            { onConflict: "trip_slug,item_type,item_id,person" },
          );
      await log(
        actor,
        "账本",
        "修改账单",
        `${patch.category} ${amount.toFixed(2)} 元 · 付款人 ${payer}`,
        { expense_id: id, before: old.data, after: patch },
      );
      return json({ ok: true, row: upd.data });
    }
    if (action === "delete_expense") {
      const id = String(payload.id || ""),
        actor = String(payload.actor || "");
      if (!id || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const old = await db
        .from("expenses")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      if (!old.data) return json({ error: "账单不存在" }, 404);
      const del = await db
        .from("expenses")
        .delete()
        .eq("trip_slug", trip_slug)
        .eq("id", id);
      if (del.error) return json({ error: del.error.message }, 500);
      await db
        .from("ledger_acknowledgements")
        .delete()
        .eq("trip_slug", trip_slug)
        .eq("item_type", "expense")
        .eq("item_id", id);
      if (old.data.receipt_path)
        await db.storage.from("trip-docs").remove([old.data.receipt_path]);
      await log(
        actor,
        "账本",
        "删除账单",
        `${old.data.category} ${Number(old.data.amount).toFixed(2)} 元 · 付款人 ${old.data.payer}`,
        { expense_id: id, deleted: old.data },
      );
      return json({ ok: true });
    }
    if (action === "acknowledge_expense") {
      const id = String(payload.expense_id || ""),
        person = String(payload.person || "");
      if (!id || !PEOPLE.includes(person))
        return json({ error: "invalid request" }, 400);
      const e = await db
        .from("expenses")
        .select("id,payer,participants")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (e.error) return json({ error: e.error.message }, 500);
      if (!e.data) return json({ error: "账单不存在" }, 404);
      if (
        e.data.payer === person ||
        !(e.data.participants || []).includes(person)
      )
        return json({ ok: true, skipped: true });
      const row = {
        trip_slug,
        item_type: "expense",
        item_id: id,
        person,
        acked_at: new Date().toISOString(),
      };
      const ack = await db
        .from("ledger_acknowledgements")
        .upsert(row, { onConflict: "trip_slug,item_type,item_id,person" })
        .select()
        .single();
      if (ack.error) return json({ error: ack.error.message }, 500);
      await log(person, "账本", "确认账单", "已知晓该笔共同支出", {
        expense_id: id,
      });
      return json({ ok: true, row: ack.data });
    }
    if (action === "add_repayment") {
      const from = String(payload.from_person || ""),
        to = String(payload.to_person || ""),
        amount = Number(payload.amount || 0),
        actor = String(payload.actor || from);
      if (
        !PEOPLE.includes(from) ||
        !PEOPLE.includes(to) ||
        from === to ||
        !(amount > 0)
      )
        return json({ error: "invalid repayment" }, 400);
      const { data, error } = await db
        .from("repayments")
        .insert({
          trip_slug,
          from_person: from,
          to_person: to,
          amount,
          note: String(payload.note || ""),
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      await log(
        PEOPLE.includes(actor) ? actor : from,
        "账本",
        "记录还款",
        `${from} 向 ${to} 支付 ${amount.toFixed(2)} 元`,
        { repayment_id: data.id, from, to, amount },
      );
      return json({ ok: true, row: data });
    }
    if (action === "update_repayment") {
      const id = String(payload.id || ""),
        actor = String(payload.actor || "");
      if (!id || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const old = await db
        .from("repayments")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      if (!old.data) return json({ error: "收付款记录不存在" }, 404);
      const from =
          payload.from_person == null
            ? old.data.from_person
            : String(payload.from_person),
        to =
          payload.to_person == null
            ? old.data.to_person
            : String(payload.to_person),
        amount =
          payload.amount == null
            ? Number(old.data.amount)
            : Number(payload.amount);
      if (
        !PEOPLE.includes(from) ||
        !PEOPLE.includes(to) ||
        from === to ||
        !(amount > 0)
      )
        return json({ error: "收付款内容不合法" }, 400);
      const patch = {
        from_person: from,
        to_person: to,
        amount,
        note: payload.note == null ? old.data.note || "" : String(payload.note),
      };
      const upd = await db
        .from("repayments")
        .update(patch)
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .select()
        .single();
      if (upd.error) return json({ error: upd.error.message }, 500);
      await log(
        actor,
        "账本",
        "修改收付款",
        `${from} → ${to} ${amount.toFixed(2)} 元`,
        { repayment_id: id, before: old.data, after: patch },
      );
      return json({ ok: true, row: upd.data });
    }
    if (action === "delete_repayment") {
      const id = String(payload.id || ""),
        actor = String(payload.actor || "");
      if (!id || !PEOPLE.includes(actor))
        return json({ error: "invalid request" }, 400);
      const old = await db
        .from("repayments")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      if (!old.data) return json({ error: "收付款记录不存在" }, 404);
      const del = await db
        .from("repayments")
        .delete()
        .eq("trip_slug", trip_slug)
        .eq("id", id);
      if (del.error) return json({ error: del.error.message }, 500);
      await log(
        actor,
        "账本",
        "删除收付款",
        `${old.data.from_person} → ${old.data.to_person} ${Number(old.data.amount).toFixed(2)} 元`,
        { repayment_id: id, deleted: old.data },
      );
      return json({ ok: true });
    }
    if (action === "attach_receipt") {
      const id = String(payload.expense_id || ""),
        person = String(payload.person || "");
      if (!id) return json({ error: "expense_id required" }, 400);
      const { mime, bytes } = fileData(String(payload.data_url || ""));
      if (
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          mime,
        )
      )
        return json({ error: "invalid receipt file" }, 400);
      if (bytes.byteLength > 5242880)
        return json({ error: "file too large" }, 413);
      const ext =
        mime === "application/pdf"
          ? "pdf"
          : mime === "image/png"
            ? "png"
            : mime === "image/webp"
              ? "webp"
              : "jpg";
      const path = `${trip_slug}/receipts/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage
        .from("trip-docs")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (up.error) return json({ error: up.error.message }, 500);
      const u = await db
        .from("expenses")
        .update({
          receipt_path: path,
          receipt_name: String(payload.name || "小票"),
        })
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .select()
        .single();
      if (u.error) return json({ error: u.error.message }, 500);
      if (PEOPLE.includes(person))
        await log(person, "账本", "上传小票", String(payload.name || "小票"), {
          expense_id: id,
        });
      return json({ ok: true, row: u.data });
    }
    if (action === "update_person_position") {
      const person = String(payload.person || "").trim();
      if (!PEOPLE.includes(person))
        return json({ error: "invalid person" }, 400);
      const row = {
        trip_slug,
        person,
        lat: Number(payload.lat),
        lon: Number(payload.lon),
        accuracy: payload.accuracy == null ? null : Number(payload.accuracy),
        speed: payload.speed == null ? null : Number(payload.speed),
        heading: payload.heading == null ? null : Number(payload.heading),
        altitude: payload.altitude == null ? null : Number(payload.altitude),
        status: String(payload.status || ""),
        updated_at: new Date().toISOString(),
      };
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon))
        return json({ error: "invalid coordinates" }, 400);
      const { data, error } = await db
        .from("person_positions")
        .upsert(row, { onConflict: "trip_slug,person" })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      await db
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("trip_slug", trip_slug)
        .eq("person", person);
      return json({ ok: true, row: data });
    }
    if (action === "save_parking") {
      const person = String(payload.saved_by || "");
      const row = {
        trip_slug,
        lat: Number(payload.lat),
        lon: Number(payload.lon),
        accuracy: payload.accuracy == null ? null : Number(payload.accuracy),
        altitude: payload.altitude == null ? null : Number(payload.altitude),
        saved_by: person,
        note: String(payload.note || "停车位置"),
        updated_at: new Date().toISOString(),
      };
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon))
        return json({ error: "invalid coordinates" }, 400);
      const { data, error } = await db
        .from("parking_position")
        .upsert(row, { onConflict: "trip_slug" })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      if (PEOPLE.includes(person))
        await log(person, "位置", "保存停车位置", row.note);
      return json({ ok: true, row: data });
    }
    if (action === "update_preferences") {
      const person = String(payload.updated_by || "");
      const allowed: any = { trip_slug, updated_at: new Date().toISOString() };
      if (payload.trip_budget != null)
        allowed.trip_budget = Number(payload.trip_budget);
      if (payload.active_driver != null)
        allowed.active_driver = String(payload.active_driver);
      if (payload.active_vehicle != null)
        allowed.active_vehicle = String(payload.active_vehicle);
      const { data, error } = await db
        .from("trip_preferences")
        .upsert(allowed, { onConflict: "trip_slug" })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      if (PEOPLE.includes(person))
        await log(person, "设置", "更新旅行设置", "更新了预算/车辆相关设置");
      return json({ ok: true, row: data });
    }
    if (action === "add_booking") {
      const person = String(payload.uploaded_by || "");
      const row = {
        trip_slug,
        kind: String(payload.kind || "其他"),
        title: String(payload.title || ""),
        details: String(payload.details || ""),
        booking_date: String(payload.booking_date || ""),
        uploaded_by: person,
        status: String(payload.status || "已确认"),
      };
      if (!row.title) return json({ error: "title required" }, 400);
      const { data, error } = await db
        .from("bookings")
        .insert(row)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      if (PEOPLE.includes(person))
        await log(person, "预订", "新增预订", `${row.kind} · ${row.title}`, {
          booking_id: data.id,
        });
      return json({ ok: true, row: data });
    }
    if (action === "upload_photo") {
      const person = String(payload.uploaded_by || "");
      if (!PEOPLE.includes(person))
        return json({ error: "invalid uploader" }, 400);
      const { mime, bytes } = fileData(String(payload.data_url || ""));
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        return json({ error: "invalid image" }, 400);
      if (bytes.byteLength > 2097152)
        return json({ error: "image too large" }, 413);
      const ext =
        mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${trip_slug}/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage
        .from("trip-memories")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (up.error) return json({ error: up.error.message }, 500);
      const row = {
        trip_slug,
        caption: String(payload.caption || ""),
        storage_path: path,
        uploaded_by: person,
      };
      const ins = await db.from("memories").insert(row).select().single();
      if (ins.error) return json({ error: ins.error.message }, 500);
      await log(person, "相册", "上传照片", row.caption || "上传了一张照片", {
        memory_id: ins.data.id,
      });
      const signed = await db.storage
        .from("trip-memories")
        .createSignedUrl(path, 604800);
      return json({
        ok: true,
        row: { ...ins.data, url: signed.data?.signedUrl || null },
      });
    }
    if (action === "delete_photo") {
      const person = String(payload.person || ""),
        id = String(payload.id || "");
      if (!PEOPLE.includes(person) || !id)
        return json({ error: "invalid request" }, 400);
      const q = await db
        .from("memories")
        .select("*")
        .eq("trip_slug", trip_slug)
        .eq("id", id)
        .maybeSingle();
      if (q.error) return json({ error: q.error.message }, 500);
      if (!q.data) return json({ error: "not found" }, 404);
      if (q.data.uploaded_by !== person)
        return json({ error: "只能删除自己上传的照片" }, 403);
      const del = await db
        .from("memories")
        .delete()
        .eq("trip_slug", trip_slug)
        .eq("id", id);
      if (del.error) return json({ error: del.error.message }, 500);
      await db.storage.from("trip-memories").remove([q.data.storage_path]);
      await log(
        person,
        "相册",
        "删除照片",
        q.data.caption || "删除了一张照片",
        { memory_id: id },
      );
      return json({ ok: true });
    }
    if (action === "upsert_emergency_contact") {
      const person = String(payload.updated_by || "");
      const id = String(payload.id || "");
      const row = {
        trip_slug,
        kind: String(payload.kind || "其他"),
        label: String(payload.label || ""),
        phone: String(payload.phone || ""),
        note: String(payload.note || ""),
        updated_at: new Date().toISOString(),
      };
      if (!row.label || !row.phone)
        return json({ error: "label/phone required" }, 400);
      let data, error;
      if (id)
        ({ data, error } = await db
          .from("emergency_contacts")
          .update(row)
          .eq("trip_slug", trip_slug)
          .eq("id", id)
          .select()
          .single());
      else
        ({ data, error } = await db
          .from("emergency_contacts")
          .insert(row)
          .select()
          .single());
      if (error) return json({ error: error.message }, 500);
      if (PEOPLE.includes(person))
        await log(person, "设置", "更新应急联系人", row.label);
      return json({ ok: true, row: data });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
