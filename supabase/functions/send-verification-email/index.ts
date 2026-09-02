// Sends the verify link for a credit claim to the verifier's email, so the
// claimant doesn't have to share it manually. Called by ClaimsContext right
// after a claim is inserted.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8081";
const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "587");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? "The Circle <noreply@thecircle.local>";

// The app's real brand colors (constants/theme.ts), kept in sync by hand
// since this function can't import from the app bundle.
const COLORS = {
  dark: "#12182B",
  accent: "#2FD3C8",
  accentDark: "#1AA89E",
  background: "#EEF1F4",
  card: "#FFFFFF",
  textSecondary: "#6B7686",
  textMuted: "#9AA3B2",
  border: "#E4E8EE",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildVerificationEmailHtml(params: {
  claimantName: string;
  title: string;
  skillCategory: string;
  points: number;
  org: string;
  verifyUrl: string;
}): string {
  const { claimantName, title, skillCategory, points, org, verifyUrl } = params;
  const name = escapeHtml(claimantName);
  const claimTitle = escapeHtml(title);
  const category = escapeHtml(skillCategory);
  const orgName = escapeHtml(org);

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:${COLORS.background}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:${COLORS.card}; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="background-color:${COLORS.dark}; padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:11px; font-weight:700; letter-spacing:1.5px; color:${COLORS.accent}; text-transform:uppercase;">
                      THE CIRCLE
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px; font-size:15px; font-weight:600; color:#ffffff;">
                      Work verification request
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px; font-size:15px; line-height:22px; color:${COLORS.dark};">
                  Hi,
                </p>
                <p style="margin:0 0 20px; font-size:15px; line-height:22px; color:${COLORS.dark};">
                  <strong>${name}</strong> says they completed the following work and listed you as their verifier:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background}; border-radius:12px; margin-bottom:24px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:15px; font-weight:700; color:${COLORS.dark}; margin-bottom:6px;">${claimTitle}</div>
                      <div style="font-size:13px; color:${COLORS.textSecondary};">${category} · ${points} pts · ${orgName}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:999px; background-color:${COLORS.accentDark};">
                      <a href="${verifyUrl}" style="display:inline-block; padding:14px 28px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">
                        Review and confirm
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0; font-size:12px; line-height:18px; color:${COLORS.textMuted};">
                  If the button doesn't work, copy this link into your browser:<br />
                  <a href="${verifyUrl}" style="color:${COLORS.accentDark};">${verifyUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid ${COLORS.border};">
                <p style="margin:0; font-size:12px; line-height:18px; color:${COLORS.textMuted};">
                  This is an automated message from The Circle. If you don't recognize this request, you can safely ignore this email — no action will be taken without your confirmation.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (!SMTP_HOST) {
      return Response.json({ message: "Email is not configured" }, { status: 500 });
    }

    const { claimId } = await req.json();
    if (!claimId) {
      return Response.json({ message: "claimId is required" }, { status: 400 });
    }

    // ctx.supabase is scoped to the caller — RLS ("Users can read their own
    // claims") means this only resolves if claimId belongs to them.
    const { data: claim, error: claimError } = await ctx.supabase
      .from("credit_claims")
      .select("title, skill_category, points, org, verify_token, verifier_email")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return Response.json({ message: "Claim not found" }, { status: 404 });
    }
    if (!claim.verifier_email) {
      return Response.json({ message: "This claim has no verifier email" }, { status: 400 });
    }

    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ctx.userClaims!.id)
      .single();

    const claimantName = profile?.full_name ?? "Someone on The Circle";
    const verifyUrl = `${APP_URL}/verify/${claim.verify_token}`;
    const hasCredentials = !!(SMTP_USER && SMTP_PASS);
    // Port 465 expects TLS from the first byte; every other port (587, 25,
    // Inbucket's 1025) expects a plaintext connection that upgrades via
    // STARTTLS — denomailer negotiates that automatically unless disabled
    // below, so tls:true here would break Gmail's 587 the same way it broke
    // just now (TLS ClientHello sent where Gmail expected plaintext EHLO).
    const useImplicitTls = SMTP_PORT === 465;

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: useImplicitTls,
        auth: hasCredentials ? { username: SMTP_USER!, password: SMTP_PASS! } : undefined,
      },
      // Local Mailpit has no TLS/auth — only relax security when we're not
      // authenticating against a real provider.
      debug: hasCredentials ? undefined : { allowUnsecure: true, noStartTLS: true },
    });

    try {
      await client.send({
        from: SMTP_FROM,
        to: claim.verifier_email,
        subject: `${claimantName} needs you to verify their work`,
        content:
          `${claimantName} says they completed "${claim.title}" (${claim.skill_category}, ` +
          `${claim.points} pts) at ${claim.org}, and listed you as their verifier.\n\n` +
          `Confirm or deny this here:\n${verifyUrl}\n\n` +
          `If you don't recognize this, you can safely ignore this email.`,
        html: buildVerificationEmailHtml({
          claimantName,
          title: claim.title,
          skillCategory: claim.skill_category,
          points: claim.points,
          org: claim.org,
          verifyUrl,
        }),
      });
    } catch (e) {
      console.error("Failed to send verification email:", e);
      return Response.json({ message: "Failed to send email" }, { status: 502 });
    } finally {
      // Never let a close() failure (e.g. the connection never opened) mask
      // the real error from send() above.
      try {
        await client.close();
      } catch (closeError) {
        console.error("Failed to close SMTP client:", closeError);
      }
    }

    return Response.json({ success: true });
  }),
};
