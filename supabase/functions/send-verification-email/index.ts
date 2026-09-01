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
