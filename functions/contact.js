import { EmailMessage } from "cloudflare:email";

/**
 * Cloudflare Pages Function — お問い合わせフォームのメール送信ハンドラ
 *
 * 必要なダッシュボード設定（Pages → Settings → Functions → Email bindings）:
 *   Variable name : SEND_EMAIL
 *   Destination   : support@mineria-labs.com
 *
 * また、Cloudflare Email Routing でドメインの受信設定が有効になっている必要があります。
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
    name      = fd.get("name");
    email     = fd.get("email");
    category  = fd.get("category");
    message   = fd.get("message");
    honeypot  = fd.get("_gotcha");
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

  // ── MIME メッセージ構築 ──
  const subjectText = `[Mineria お問い合わせ] ${category} — ${name}`;
  const bodyText = [
    `お名前　　: ${name}`,
    `メール　　: ${email}`,
    `お問い合わせ種別: ${category}`,
    "",
    "── お問い合わせ内容 ──────────────────",
    message,
    "─────────────────────────────────────",
  ].join("\n");

  const subjectB64 = toB64(subjectText);
  const bodyB64    = toB64(bodyText);

  const raw = [
    "MIME-Version: 1.0",
    `From: Mineria <noreply@mineria-labs.com>`,
    `To: support@mineria-labs.com`,
    `Reply-To: ${name} <${email}>`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
  ].join("\r\n");

  // ── 送信 ──
  try {
    const emailMsg = new EmailMessage(
      "noreply@mineria-labs.com",
      "support@mineria-labs.com",
      raw
    );
    await env.SEND_EMAIL.send(emailMsg);
    return jsonOk();
  } catch (err) {
    console.error("Email send error:", err);
    return jsonError("メール送信に失敗しました", 500);
  }
}

// GET リクエストは 405 を返す
export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}

// ── ユーティリティ ──

/** UTF-8 文字列を Base64 に変換 */
function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function jsonOk() {
  return Response.json({ ok: true }, {
    headers: corsHeaders(),
  });
}

function jsonError(message, status = 400) {
  return Response.json({ ok: false, error: message }, {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://mineria-labs.com",
    "Content-Type": "application/json",
  };
}
