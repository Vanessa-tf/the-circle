// One-off seed script: creates/reuses real accounts and posts real listings
// through the actual authenticated REST path (RLS-enforced), exactly like
// the app itself would. Run once with `node scripts/seed-listings.mjs`.
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const DEMO_PASSWORD = "DemoPass123!";

const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensurePassword(email) {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`User not found: ${email}`);
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: DEMO_PASSWORD,
  });
  if (updateError) throw updateError;
  return user.id;
}

function client() {
  return createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return { client: c, userId: data.user.id };
}

async function signUpIndividual(email, fullName) {
  const c = client();
  const { data, error } = await c.auth.signUp({
    email,
    password: DEMO_PASSWORD,
    options: { data: { full_name: fullName, account_type: "Individual" } },
  });
  if (error && !String(error.message).includes("already registered")) throw error;
  if (data?.session) return { client: c, userId: data.user.id };
  return signIn(email);
}

async function main() {
  console.log("Resetting known passwords on existing demo accounts...");
  await ensurePassword("mamakavee1729@gmail.com");
  await ensurePassword("thandonzimande1729@gmail.com");

  console.log("Signing in as Novatech Inc (Company)...");
  const company = await signIn("mamakavee1729@gmail.com");

  console.log("Signing in as Thando Nzimande (Individual, future mentor)...");
  const thando = await signIn("thandonzimande1729@gmail.com");

  console.log("Creating a second applicant account, Amara Okafor...");
  const amara = await signUpIndividual("amaraokafor1729@gmail.com", "Amara Okafor");

  // --- Company posts real listings ---
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

  // --- Thando opts in as a mentor ---
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

  // --- Amara affiliates with Novatech (so Startup team-score stats have real data) ---
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

  // --- Amara applies to a job, a freelance gig, and books the mentor ---
  console.log("Amara applies to the Backend Engineer job...");
  const { data: jobApp, error: jobAppError } = await amara.client
    .from("applications")
    .insert({
      user_id: amara.userId,
      listing_id: createdListings.Jobs.id,
      note: "I've shipped two production APIs this year and would love to bring that experience to Novatech's backend team.",
    })
    .select("id")
    .single();
  if (jobAppError) throw jobAppError;

  console.log("Amara applies to the freelance gig...");
  const { data: freelanceApp, error: freelanceAppError } = await amara.client
    .from("applications")
    .insert({
      user_id: amara.userId,
      listing_id: createdListings.Freelance.id,
      note: "I can turn this around in under two weeks — portfolio link is on my profile.",
    })
    .select("id")
    .single();
  if (freelanceAppError) throw freelanceAppError;

  console.log("Amara books a session with Thando...");
  const { error: bookingError } = await amara.client.from("applications").insert({
    user_id: amara.userId,
    listing_id: mentorListing.id,
    note: "Would love 30 minutes to talk through moving from IC to tech lead.",
  });
  if (bookingError) throw bookingError;

  // --- Company resolves: approve the job application, leave freelance pending ---
  console.log("Novatech approves Amara's job application...");
  const { error: resolveJobError } = await company.client.rpc("resolve_application", {
    p_application_id: jobApp.id,
    p_approve: true,
  });
  if (resolveJobError) throw resolveJobError;

  console.log("Done. Freelance application and mentor booking are left pending for live review.");
  console.log(`Demo password for mamakavee1729@gmail.com / thandonzimande1729@gmail.com / amaraokafor1729@gmail.com: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
