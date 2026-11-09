import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../../config/env.js";
import type {
  EmailSender,
  PurchaseRequestEmailParams,
  SellerApplicationEmailParams,
  VerificationEmailResult
} from "../domain/email-sender.js";

function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM);
}

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD
          }
        : undefined
  });
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

function buildPurchaseRequestText(params: PurchaseRequestEmailParams): string {
  const lines = [
    `You have a new ticket request on Miami Tix.`,
    ``,
    `Event: ${params.eventTitle}`,
    `When: ${formatDateTime(params.eventStartAt)}`,
    params.eventVenue ? `Where: ${params.eventVenue} - ${params.eventCity}` : `Where: ${params.eventCity}`,
    ``,
    `Listing: ${params.listingTitle}`,
    `Seat type: ${params.seatType}`,
    `Price per ticket: ${formatCurrency(params.pricePerTicketCents)}`,
    `Quantity requested: ${params.quantity}`,
    `Total: ${formatCurrency(params.totalPriceCents)}`,
    ``,
    `Buyer: ${params.buyerName} (${params.buyerEmail})`,
    `Phone: ${params.buyerPhone}`,
    ``,
    `Reach out to the buyer to finalize the sale.`
  ];
  if (params.listingUrl) {
    lines.push("", `View listing: ${params.listingUrl}`);
  }
  return lines.join("\n");
}

function buildPurchaseRequestHtml(params: PurchaseRequestEmailParams): string {
  const venueLine = params.eventVenue
    ? `${escapeHtml(params.eventVenue)} &middot; ${escapeHtml(params.eventCity)}`
    : escapeHtml(params.eventCity);
  const listingButton = params.listingUrl
    ? `<a href="${escapeAttr(params.listingUrl)}" style="display:inline-block;margin-top:24px;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#ff2ea8,#22d3ff);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">View listing</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
  </head>
  <body style="margin:0;padding:0;background:#f4f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111b3a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e6f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:4px 0 0 0;background:linear-gradient(90deg,#ff2ea8,#22d3ff);height:4px;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 28px 0 28px;">
                <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#ff2ea8;font-weight:700;">New ticket request</div>
                <h1 style="margin:10px 0 0 0;font-size:24px;font-weight:700;line-height:1.2;color:#0c1230;">${escapeHtml(params.eventTitle)}</h1>
                <p style="margin:6px 0 0 0;font-size:13px;color:#4a5378;">${venueLine} &middot; ${escapeHtml(formatDateTime(params.eventStartAt))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ffd0e8;border-radius:12px;background:#fff3fa;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c81e7b;font-weight:700;">Buyer phone</div>
                      <div style="margin-top:6px;font-size:24px;font-weight:700;color:#0c1230;letter-spacing:0.02em;">${escapeHtml(params.buyerPhone)}</div>
                      <div style="margin-top:6px;font-size:13px;color:#4a5378;">${escapeHtml(params.buyerName)} &middot; ${escapeHtml(params.buyerEmail)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${renderRow("Listing", escapeHtml(params.listingTitle))}
                  ${renderRow("Seat type", escapeHtml(params.seatType))}
                  ${renderRow("Price / ticket", formatCurrency(params.pricePerTicketCents))}
                  ${renderRow("Quantity", String(params.quantity))}
                  ${renderRow("Total", `<strong style=\"color:#0c1230;font-size:16px;\">${formatCurrency(params.totalPriceCents)}</strong>`, true)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px 28px;">
                <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#4a5378;">Reach out to the buyer to finalize the sale. They're expecting your call or text.</p>
                ${listingButton}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px 28px;border-top:1px solid #e3e6f0;">
                <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7494;font-weight:600;">Miami Tix &middot; Live house music marketplace</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderRow(label: string, value: string, isLast = false): string {
  const borderStyle = isLast ? "" : "border-bottom:1px solid #eceff7;";
  return `<tr>
    <td style="padding:12px 0;${borderStyle}font-size:11px;color:#6b7494;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">${escapeHtml(label)}</td>
    <td align="right" style="padding:12px 0;${borderStyle}font-size:14px;color:#0c1230;font-weight:500;">${value}</td>
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export class VerificationEmailSender implements EmailSender {
  async sendVerificationEmail(
    email: string,
    verificationUrl: string
  ): Promise<VerificationEmailResult> {
    if (!isSmtpConfigured()) {
      console.log(`[email] verification link for ${email}: ${verificationUrl}`);
      return { previewUrl: verificationUrl };
    }

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Verify your Miami Tix account",
        text: `Tap this link to verify your email: ${verificationUrl}`,
        html: `<p>Tap this link to verify your Miami Tix account:</p><p><a href="${escapeAttr(verificationUrl)}">${escapeHtml(verificationUrl)}</a></p>`
      });
    } catch (error) {
      console.error("[email] verification send failed:", error);
      throw error;
    }

    return {};
  }

  async sendPurchaseRequestEmail(params: PurchaseRequestEmailParams): Promise<void> {
    if (!isSmtpConfigured()) {
      console.log(
        `[email] purchase request for ${params.sellerEmail}:`,
        JSON.stringify(
          {
            event: params.eventTitle,
            listing: params.listingTitle,
            quantity: params.quantity,
            total: formatCurrency(params.totalPriceCents),
            buyer: params.buyerName,
            buyerPhone: params.buyerPhone
          },
          null,
          2
        )
      );
      return;
    }

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: params.sellerEmail,
        replyTo: params.buyerEmail,
        subject: `New ticket request: ${params.eventTitle} (${params.quantity} x ${params.seatType})`,
        text: buildPurchaseRequestText(params),
        html: buildPurchaseRequestHtml(params)
      });
    } catch (error) {
      console.error("[email] purchase request send failed:", error);
      throw error;
    }
  }

  async sendSellerApplicationEmail(params: SellerApplicationEmailParams): Promise<void> {
    const text = [
      "New verified seller application on Miami Tix.",
      "",
      `Name: ${params.name}`,
      `Email: ${params.email}`,
      "",
      "About them:",
      params.description,
      "",
      "Reply to this email to reach the applicant."
    ].join("\n");

    if (!isSmtpConfigured()) {
      console.log(`[email] seller application (would go to ${params.to}):\n${text}`);
      return;
    }

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: params.to,
        replyTo: params.email,
        subject: `Verified seller application: ${params.name}`,
        text,
        html: `<p><strong>New verified seller application on Miami Tix.</strong></p>
<p>Name: ${escapeHtml(params.name)}<br>Email: ${escapeHtml(params.email)}</p>
<p>About them:</p>
<p style="white-space:pre-wrap;">${escapeHtml(params.description)}</p>
<p>Reply to this email to reach the applicant.</p>`
      });
    } catch (error) {
      console.error("[email] seller application send failed:", error);
      throw error;
    }
  }
}
