// Seeds more fictional demo companies + real listings on the HOSTED
// Supabase project, through the actual authenticated REST path (RLS
// enforced) — same pattern as seed-listings-hosted.mjs. Purely fictional
// names, no relation to any real company (unlike company_directory, which
// holds real, unclaimed companies with zero listings attached).
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
  return signIn(email);
}

async function postListing(company, input) {
  const { data, error } = await company.client
    .from("listings")
    .insert({ ...input, owner_id: company.userId })
    .select("id, category, title")
    .single();
  if (error) throw error;
  console.log(`  + ${data.category}: ${data.title}`);
  return data;
}

async function main() {
  const companies = [
    {
      email: "hello.kaleidoscopelabs@gmail.com",
      name: "Kaleidoscope Labs",
      listings: [
        {
          category: "Jobs",
          title: "Frontend Engineer",
          subtitle: "Kaleidoscope Labs · Full-time · Cape Town",
          verified: true,
          metric_label: "SCORE REQUIRED",
          metric_value: "680+",
          secondary_label: "SALARY",
          secondary_value: "R65-85k",
          secondary_value_accent: false,
          action_label: "Apply",
          button_variant: "dark",
          score_required: 680,
          score_required_category: null,
          questions: ["What frontend frameworks have you shipped production work with?"],
        },
        {
          category: "Freelance",
          title: "Design System Overhaul",
          subtitle: "Component library refresh · 3 weeks",
          verified: true,
          metric_label: "BUDGET",
          metric_value: "R4,500",
          secondary_label: "CREDITS REQUIRED",
          secondary_value: "90 Technical",
          secondary_value_accent: true,
          action_label: "Apply",
          button_variant: "accent",
          score_required: 90,
          score_required_category: "Technical",
        },
      ],
    },
    {
      email: "careers.baobablogistics@gmail.com",
      name: "Baobab Logistics",
      listings: [
        {
          category: "Jobs",
          title: "Operations Analyst",
          subtitle: "Baobab Logistics · Full-time · Durban",
          verified: true,
          metric_label: "SCORE REQUIRED",
          metric_value: "620+",
          secondary_label: "SALARY",
          secondary_value: "R48-60k",
          secondary_value_accent: false,
          action_label: "Apply",
          button_variant: "dark",
          score_required: 620,
          score_required_category: null,
        },
      ],
    },
    {
      email: "team.nyotahealth@gmail.com",
      name: "Nyota Health",
      listings: [
        {
          category: "Jobs",
          title: "Backend Developer, Health Records",
          subtitle: "Nyota Health · Full-time · Nairobi",
          verified: true,
          metric_label: "SCORE REQUIRED",
          metric_value: "740+",
          secondary_label: "SALARY",
          secondary_value: "R70-92k",
          secondary_value_accent: false,
          action_label: "Apply",
          button_variant: "dark",
          score_required: 740,
          score_required_category: null,
          questions: [
            "Have you worked with any healthcare data privacy standards (e.g. HIPAA, POPIA)?",
          ],
        },
        {
          category: "Startups",
          title: "Nyota Health",
          subtitle: "Digital health records for East Africa",
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
      ],
    },
    {
      email: "invest.riversidecapital@gmail.com",
      name: "Riverside Capital",
      listings: [
        {
          category: "Investors",
          title: "Riverside Seed Fund",
          subtitle: "Pre-seed & seed · B2B software, fintech",
          verified: true,
          metric_label: "CHECK SIZE",
          metric_value: "R60-280k",
          secondary_label: "MIN FOUNDER SCORE",
          secondary_value: "780+",
          secondary_value_accent: false,
          action_label: "Pitch",
          button_variant: "dark",
          score_required: 780,
          score_required_category: null,
        },
      ],
    },
  ];

  for (const c of companies) {
    console.log(`Signing up/in ${c.name}...`);
    const company = await signUpOrSignIn(c.email, c.name, "Company");
    for (const listing of c.listings) {
      await postListing(company, { ...listing, questions: listing.questions ?? [] });
    }
  }

  console.log(`\nDone. All new demo accounts use password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
