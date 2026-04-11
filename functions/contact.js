/**
 * Cloudflare Pages Function — お問い合わせフォームのメール送信ハンドラ
 *
 * 必要なダッシュボード設定（Workers & Pages → mineria-labs-site → バインディング → メールサービス）:
 *   変数名     : SEND_EMAIL
 *   送信先     : support@mineria-labs.com
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // ── 入力取得 ──
  let name, email, category, message, honeypot;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json();
    ({ name, email, category, message, _gotcha: honeypot } = json);
  } else {
    const fd = await request.formData();
    name     = fd.get("name");
    email    = fd.get("email");
    category = fd.get("category");
    message  = fd.get("message");
    honeypot = fd.get("_gotcha");
  }

  name     = (name     || "").trim();
  email    = (email    || "").trim();
  category = (category || "その他").trim();
  message  = (message  || "").trim();

  // ── スパムフィルタ（ハニーポット） ──
  if (honeypot) {
    return jsonOk(); // スパムは黙って成功を返す
  }

  // ── バリデーション ──
  if (!name || !email || !message) {
    return jsonError("必須項目が未入力です", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("メールアドレスの形式が正しくありません", 400);
  }

  // ── メール送信 ──
  const subject = `[Mineria お問い合わせ] ${category} — ${name}`;
  const body = [
    `お名前　　　　　: ${name}`,
    `メールアドレス　: ${email}`,
    `お問い合わせ種別: ${category}`,
    ``,
    `── お問い合わせ内容 ──────────────────`,
    message,
    `─────────────────────────────────────`,
  ].join("\n");

  try {
    await env.SEND_EMAIL.send({
      from: "noreply@mineria-labs.com",
      to:   "support@mineria-labs.com",
      subject,
      text: body,
      replyTo: email,
    });
    return jsonOk();
  } catch (err) {
    console.error("Email send error:", err);
    return jsonError("メール送信に失敗しました", 500);
  }
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}

// ── ユーティリティ ──
function jsonOk() {
  return Response.json({ ok: true });
}

function jsonError(message, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
