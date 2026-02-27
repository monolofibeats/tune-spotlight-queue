/**
 * Shared UpStar email wrapper — black / yellow / white branded template.
 * Used by ALL transactional emails for consistent branding.
 */

const siteUrl = Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

export function wrapEmail(
  title: string,
  bodyHtml: string,
  ctaUrl?: string,
  ctaLabel?: string,
): string {
  const ctaBlock =
    ctaUrl && ctaLabel
      ? `<div style="margin:28px 0;text-align:center;">
           <a href="${ctaUrl}" style="background:#EAB308;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">${ctaLabel}</a>
         </div>`
      : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#000;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="padding:28px 24px 0;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#EAB308;margin-bottom:2px;">UpStar</div>
        <div style="font-size:11px;color:#888;margin-bottom:20px;">Song Review Platform</div>
      </div>
      <div style="padding:0 24px 28px;">
        <div style="background:linear-gradient(135deg,#1a1a1a,#111);border:1px solid #333;border-radius:10px;padding:24px;">
          <h2 style="font-size:18px;font-weight:700;color:#fff;margin:0 0 14px;">${title}</h2>
          <div style="color:#ccc;font-size:14px;line-height:1.7;">${bodyHtml}</div>
          ${ctaBlock}
        </div>
        <p style="color:#666;font-size:11px;text-align:center;margin-top:18px;">
          This email was sent by <a href="${siteUrl}" style="color:#EAB308;text-decoration:none;">UpStar</a>
        </p>
      </div>
    </div>`;
}
