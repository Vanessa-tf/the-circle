// Seeds the HOSTED Supabase project with real demo accounts/listings,
// through the actual authenticated REST path (RLS-enforced). Run with
// `node scripts/seed-listings-hosted.mjs`.
import { createClient } from "@supabase/supabase-js";

const URL = "https://htguqirjbclrzbmjnhuh.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z3VxaXJqYmNscnpibWpuaHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NDc3MjAsImV4cCI6MjEwMzMyMzcyMH0.UxS0RQuOwpUgXIeITAUmYjgUsnWDkS9E4ypQyi9QNGg";
const DEMO_PASSWORD = "DemoPass123!";

function client() {
  return createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return { client: c, userId: data.user.id };
}

async function signUpOrSignIn(email, fullName, accountType) {
  const c = client();
  const { data, error } = await c.auth.signUp({
    email,
    password: DEMO_PASSWORD,
    options: { data: { full_name: fullName, account_type: accountType } },
  });
  if (data?.session) return { client: c, userId: data.user.id };
  if (error && !String(error.message).includes("already registered")) throw error;

  // signUp() never returns a session for a pre-existing account (confirmed
  // or not) — the only way to tell which is to actually try signing in.
  try {
    return await signIn(email);
  } catch (signInErr) {
    throw new Error(
      `${email} can't sign in yet (${signInErr.message}) — check the inbox for a confirmation email, or confirm "Confirm email" is off.`
    );
  }
}

async function main() {
  console.log("Signing up/in Novatech Inc (Company)...");
  const company = await signUpOrSignIn("mamakavee1729@gmail.com", "Novatech Inc", "Company");

  console.log("Signing up/in Thando Nzimande (Individual, future mentor)...");
  const thando = await signUpOrSignIn("thandonzimande1729@gmail.com", "Thando Nzimande", "Individual");

  console.log("Signing up/in Amara Okafor (Individual, applicant)...");
  const amara = await signUpOrSignIn("amaraokafor1729@gmail.com", "Amara Okafor", "Individual");

  const listingsToCreate = [
    {
      category: "Jobs",
      title: "Backend Engineer",
      subtitle: "Novatech Inc · Full-time · Remote",
      verified: true,
      metric_label: "SCORE REQUIRED",
      metric_value: "700+",
      secondary_label: "SALARY",
      secondary_value: "R72-95k",
      secondary_value_accent: false,
      action_label: "Apply",
      button_variant: "dark",
      score_required: 700,
      score_required_category: null,
      questions: [
        "What backend systems have you shipped to production?",
        "Why are you interested in Novatech specifically?",
      ],
    },
    {
      category: "Freelance",
      title: "Mobile App Polish",
      subtitle: "UI cleanup + bug fixes · 2 weeks",
      verified: true,
      metric_label: "BUDGET",
      metric_value: "R2,400",
      secondary_label: "CREDITS REQUIRED",
      secondary_value: "100 Technical",
      secondary_value_accent: true,
      action_label: "Apply",
      button_variant: "accent",
      score_required: 100,
      score_required_category: "Technical",
    },
    {
      category: "Investors",
      title: "Novatech Ventures",
      subtitle: "Seed · B2B SaaS, fintech",
      verified: true,
      metric_label: "CHECK SIZE",
      metric_value: "R75-300k",
      secondary_label: "MIN FOUNDER SCORE",
      secondary_value: "800+",
      secondary_value_accent: false,
      action_label: "Pitch",
      button_variant: "dark",
      score_required: 800,
      score_required_category: null,
    },
    {
      category: "Startups",
      title: "Novatech Labs",
      subtitle: "Developer tooling · Hiring",
      verified: true,
      metric_label: "TEAM SCORE AVG",
      metric_value: "—",
      secondary_label: "OPEN ROLES",
      secondary_value: "—",
      secondary_value_accent: false,
      action_label: "View",
      button_variant: "dark",
      score_required: null,
      score_required_category: null,
    },
  ];

  console.log("Posting company listings...");
  const createdListings = {};
  for (const input of listingsToCreate) {
    const { data, error } = await company.client
      .from("listings")
      .insert({ ...input, owner_id: company.userId })
      .select("id, category, title")
      .single();
    if (error) throw error;
    createdListings[input.category] = data;
    console.log(`  + ${data.category}: ${data.title}`);
  }

  console.log("Thando opts in as a mentor...");
  const { data: mentorListing, error: mentorError } = await thando.client
    .from("listings")
    .insert({
      category: "Mentors",
      title: "Career Growth in Engineering",
      subtitle: "1:1 sessions · Career strategy",
      verified: true,
      metric_label: "SESSIONS",
      metric_value: "30 min",
      secondary_label: "MENTOR SCORE",
      secondary_value: "0",
      secondary_value_accent: true,
      action_label: "Book",
      button_variant: "accent",
      score_required: null,
      score_required_category: null,
      owner_id: thando.userId,
    })
    .select("id, title")
    .single();
  if (mentorError) throw mentorError;
  console.log(`  + Mentors: ${mentorListing.title}`);

  console.log("Amara requests affiliation with Novatech Inc...");
  const { data: affiliation, error: affError } = await amara.client
    .from("affiliations")
    .insert({ individual_id: amara.userId, org_id: company.userId })
    .select("id")
    .single();
  if (affError && !String(affError.message).includes("duplicate")) throw affError;
  if (affiliation) {
    const { error: resolveAffError } = await company.client.rpc("resolve_affiliation", {
      p_affiliation_id: affiliation.id,
      p_approve: true,
    });
    if (resolveAffError) throw resolveAffError;
    console.log("  + Novatech approved Amara's affiliation");
  }

  console.log("Amara applies to the Backend Engineer job...");
  const { data: jobApp, error: jobAppError } = await amara.client
    .from("applications")
    .insert({
      user_id: amara.userId,
      listing_id: createdListings.Jobs.id,
      note: "I've shipped two production APIs this year and would love to bring that experience to Novatech's backend team.",
      answers: [
        {
          question: "What backend systems have you shipped to production?",
          answer: "A payments API handling ~200k req/day, and an internal event pipeline on Postgres + Redis.",
        },
        {
          question: "Why are you interested in Novatech specifically?",
          answer: "I like that the team ships fast and the role is fully remote.",
        },
      ],
    })
    .select("id")
    .single();
  if (jobAppError) throw jobAppError;

  console.log("Amara applies to the freelance gig...");
  const { error: freelanceAppError } = await amara.client.from("applications").insert({
    user_id: amara.userId,
    listing_id: createdListings.Freelance.id,
    note: "I can turn this around in under two weeks — portfolio link is on my profile.",
  });
  if (freelanceAppError) throw freelanceAppError;

  console.log("Amara books a session with Thando...");
  const { error: bookingError } = await amara.client.from("applications").insert({
    user_id: amara.userId,
    listing_id: mentorListing.id,
    note: "Would love 30 minutes to talk through moving from IC to tech lead.",
  });
  if (bookingError) throw bookingError;

  console.log("Novatech approves Amara's job application...");
  const { error: resolveJobError } = await company.client.rpc("resolve_application", {
    p_application_id: jobApp.id,
    p_approve: true,
  });
  if (resolveJobError) throw resolveJobError;

  console.log("\nDone. Demo accounts (all password: " + DEMO_PASSWORD + "):");
  console.log("  mamakavee1729@gmail.com      (Company — Novatech Inc)");
  console.log("  thandonzimande1729@gmail.com (Individual — mentor)");
  console.log("  amaraokafor1729@gmail.com    (Individual — applicant)");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
