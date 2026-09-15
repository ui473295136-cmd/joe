// The four travellers share trip data, but every request must prove its actor.
export async function authorize(db: any, trip: string, payload: any) {
  const person = String(payload.session_person || "");
  const token = String(payload.session_token || "");
  if (!["瑞子", "普子", "航子", "辉子"].includes(person) || token.length < 20) {
    return { ok: false, status: 401, error: "登录已失效，请重新验证" };
  }
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
  const hash = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const result = await db
    .from("person_sessions")
    .select("person,expires_at")
    .eq("trip_slug", trip)
    .eq("person", person)
    .eq("token_hash", hash)
    .maybeSingle();
  if (result.error) throw result.error;
  if (
    !result.data ||
    !Number.isFinite(Date.parse(result.data.expires_at)) ||
    Date.parse(result.data.expires_at) <= Date.now()
  ) {
    return { ok: false, status: 401, error: "登录已失效，请重新验证" };
  }
  for (const field of ["actor", "person", "uploaded_by", "updated_by"]) {
    if (payload[field] != null && payload[field] !== person)
      return { ok: false, status: 403, error: "不能以其他成员的身份提交操作" };
  }
  return { ok: true, status: 200, person };
}
