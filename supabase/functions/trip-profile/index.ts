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
const FILEKEY: any = {
  瑞子: "ruizi",
  普子: "puzi",
  航子: "hangzi",
  辉子: "huizi",
};
const TRIP = "chuanxi2026";
const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const clean = (v: any, max = 80) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const validDataUrl = (s: string) =>
  /^data:image\/(jpeg|png|webp);base64,/i.test(s) && s.length <= 950000;
function avatarUrl(db: any, p: any) {
  if (p.avatar_path) {
    const u = db.storage.from("trip-avatars").getPublicUrl(p.avatar_path)
      .data.publicUrl;
    return `${u}?v=${encodeURIComponent(p.updated_at || "")}`;
  }
  return p.avatar_data || null;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { action, payload = {}, trip_slug = TRIP } = await req.json();
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

    if (action === "list_profiles") {
      const q = await db
        .from("profiles")
        .select(
          "trip_slug,person,nickname,role,avatar_data,avatar_path,updated_by,updated_at,last_seen",
        )
        .eq("trip_slug", trip_slug)
        .order("person");
      if (q.error) return json({ error: q.error.message }, 500);
      return json({
        profiles: (q.data || []).map((p: any) => ({
          ...p,
          avatar_url: avatarUrl(db, p),
          avatar_data: undefined,
        })),
      });
    }
    if (action === "update_profile") {
      const person = clean(payload.person, 20);
      if (!PEOPLE.includes(person)) return json({ error: "身份不正确" }, 400);
      const nickname = clean(payload.nickname, 20) || person,
        role = clean(payload.role, 80),
        now = new Date().toISOString();
      const old = await db
        .from("profiles")
        .select("avatar_data,avatar_path")
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      const up = await db
        .from("profiles")
        .upsert(
          {
            trip_slug,
            person,
            nickname,
            role,
            avatar_data: old.data?.avatar_data || null,
            avatar_path: old.data?.avatar_path || null,
            updated_by: person,
            updated_at: now,
            last_seen: now,
          },
          { onConflict: "trip_slug,person" },
        )
        .select()
        .single();
      if (up.error) return json({ error: up.error.message }, 500);
      await db
        .from("activity_logs")
        .insert({
          trip_slug,
          person,
          category: "资料",
          action: "修改个人资料",
          detail: `昵称：${nickname}${role ? ` · 职责：${role}` : ""}`,
          metadata: { nickname, role },
        });
      return json({
        ok: true,
        profile: {
          ...up.data,
          avatar_url: avatarUrl(db, up.data),
          avatar_data: undefined,
        },
      });
    }
    if (action === "upload_avatar") {
      const person = clean(payload.person, 20);
      if (!PEOPLE.includes(person)) return json({ error: "身份不正确" }, 400);
      const data = String(payload.data_url || "");
      if (!validDataUrl(data))
        return json({ error: "头像格式不支持或图片过大" }, 400);
      const m = data.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
      if (!m) return json({ error: "头像格式不支持" }, 400);
      const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase(),
        mime = `image/${m[1].toLowerCase() === "jpg" ? "jpeg" : m[1].toLowerCase()}`;
      const raw = atob(m[2]),
        bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const old = await db
        .from("profiles")
        .select("nickname,role,avatar_path")
        .eq("trip_slug", trip_slug)
        .eq("person", person)
        .maybeSingle();
      if (old.error) return json({ error: old.error.message }, 500);
      const path = `${trip_slug}/${FILEKEY[person]}-${Date.now()}.${ext}`;
      const put = await db.storage
        .from("trip-avatars")
        .upload(path, bytes, {
          contentType: mime,
          cacheControl: "31536000",
          upsert: false,
        });
      if (put.error) return json({ error: put.error.message }, 500);
      const now = new Date().toISOString();
      const up = await db
        .from("profiles")
        .upsert(
          {
            trip_slug,
            person,
            nickname: old.data?.nickname || person,
            role: old.data?.role || "",
            avatar_data: null,
            avatar_path: path,
            updated_by: person,
            updated_at: now,
            last_seen: now,
          },
          { onConflict: "trip_slug,person" },
        )
        .select()
        .single();
      if (up.error) {
        await db.storage.from("trip-avatars").remove([path]);
        return json({ error: up.error.message }, 500);
      }
      if (old.data?.avatar_path && old.data.avatar_path !== path)
        db.storage
          .from("trip-avatars")
          .remove([old.data.avatar_path])
          .catch(() => {});
      await db
        .from("activity_logs")
        .insert({
          trip_slug,
          person,
          category: "资料",
          action: "更新头像",
          detail: "更换了个人头像",
          metadata: { source: "profile-sync", avatar_path: path },
        });
      return json({
        ok: true,
        profile: {
          ...up.data,
          avatar_url: avatarUrl(db, up.data),
          avatar_data: undefined,
        },
      });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
