import { createClient } from "@supabase/supabase-js";
import { DEPARTMENTS } from "@/lib/departments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const demoPeople = [
  { name: "Aarav Sharma", email: "faculty1@tcet.test", role: "faculty", department: DEPARTMENTS[0] },
  { name: "Ananya Patel", email: "faculty2@tcet.test", role: "faculty", department: DEPARTMENTS[1] },
  { name: "Rohan Deshmukh", email: "faculty3@tcet.test", role: "faculty", department: DEPARTMENTS[2] },
  { name: "Isha Shah", email: "faculty4@tcet.test", role: "faculty", department: DEPARTMENTS[3] },
  { name: "Kabir Mehta", email: "faculty5@tcet.test", role: "faculty", department: DEPARTMENTS[4] },
  { name: "Meera Iyer", email: "faculty6@tcet.test", role: "faculty", department: DEPARTMENTS[5] },
  { name: "Arjun Nair", email: "faculty7@tcet.test", role: "faculty", department: DEPARTMENTS[6] },
  { name: "Kavya Joshi", email: "faculty8@tcet.test", role: "faculty", department: DEPARTMENTS[7] },
  { name: "Dev Malhotra", email: "faculty9@tcet.test", role: "faculty", department: DEPARTMENTS[8] },
  { name: "Sana Khan", email: "faculty10@tcet.test", role: "faculty", department: DEPARTMENTS[9] },
  { name: "Yash Thakur", email: "faculty11@tcet.test", role: "faculty", department: DEPARTMENTS[10] },
  { name: "Priya Menon", email: "faculty12@tcet.test", role: "faculty", department: DEPARTMENTS[0] },
  { name: "Atharva Shinde", email: "faculty13@tcet.test", role: "faculty", department: DEPARTMENTS[1] },
  { name: "Mitali Sawant", email: "faculty14@tcet.test", role: "faculty", department: DEPARTMENTS[2] },
  { name: "Sahil Gupta", email: "faculty15@tcet.test", role: "faculty", department: DEPARTMENTS[3] },
  { name: "Rhea Fernandes", email: "faculty16@tcet.test", role: "faculty", department: DEPARTMENTS[4] },
  { name: "Pranav Kulkarni", email: "faculty17@tcet.test", role: "faculty", department: DEPARTMENTS[5] },
  { name: "Tanvi Desai", email: "faculty18@tcet.test", role: "faculty", department: DEPARTMENTS[6] },
  { name: "Neil D'Souza", email: "faculty19@tcet.test", role: "faculty", department: DEPARTMENTS[7] },
  { name: "Simran Kaur", email: "faculty20@tcet.test", role: "faculty", department: DEPARTMENTS[8] },
  { name: "Vedant Joshi", email: "faculty21@tcet.test", role: "faculty", department: DEPARTMENTS[9] },
  { name: "Ayesha Shaikh", email: "faculty22@tcet.test", role: "faculty", department: DEPARTMENTS[10] },
  { name: "Manav Chavan", email: "faculty23@tcet.test", role: "faculty", department: DEPARTMENTS[0] },
  { name: "Diya Pillai", email: "faculty24@tcet.test", role: "faculty", department: DEPARTMENTS[1] },
  { name: "Samar Joshi", email: "faculty25@tcet.test", role: "faculty", department: DEPARTMENTS[2] },
  { name: "Nandini Reddy", email: "faculty26@tcet.test", role: "faculty", department: DEPARTMENTS[3] },
  { name: "Ritvik Shah", email: "faculty27@tcet.test", role: "faculty", department: DEPARTMENTS[4] },
  { name: "Esha Nair", email: "faculty28@tcet.test", role: "faculty", department: DEPARTMENTS[5] },
  { name: "Kartik Bhandari", email: "faculty29@tcet.test", role: "faculty", department: DEPARTMENTS[6] },
  { name: "Aarohi Patil", email: "faculty30@tcet.test", role: "faculty", department: DEPARTMENTS[7] },
  { name: "Dhruv Shetty", email: "faculty31@tcet.test", role: "faculty", department: DEPARTMENTS[8] },
  { name: "Sakshi Verma", email: "faculty32@tcet.test", role: "faculty", department: DEPARTMENTS[9] },
  { name: "Ishaan Kamat", email: "faculty33@tcet.test", role: "faculty", department: DEPARTMENTS[10] },
  { name: "Vaishali Kaiche", email: "hod@comptcet.test", role: "hod", department: DEPARTMENTS[0] },
  { name: "Purvi Sankhe", email: "hod@ittcet.test", role: "hod", department: DEPARTMENTS[1] },
  { name: "Nikhil Bhosale", email: "hod@ettcet.test", role: "hod", department: DEPARTMENTS[2] },
  { name: "Rituja Gawde", email: "hod@ecstcet.test", role: "hod", department: DEPARTMENTS[3] },
  { name: "Siddharth More", email: "hod@mechtcet.test", role: "hod", department: DEPARTMENTS[4] },
  { name: "Pooja Naik", email: "hod@civiltcet.test", role: "hod", department: DEPARTMENTS[5] },
  { name: "Omkar Jadhav", email: "hod@cstcet.test", role: "hod", department: DEPARTMENTS[6] },
  { name: "Sneha Kulkarni", email: "hod@mmtcet.test", role: "hod", department: DEPARTMENTS[7] },
  { name: "Rahul Pawar", email: "hod@aimltcet.test", role: "hod", department: DEPARTMENTS[8] },
  { name: "Aditi Rao", email: "hod@aidstcet.test", role: "hod", department: DEPARTMENTS[9] },
  { name: "Harsh Vora", email: "hod@iottcet.test", role: "hod", department: DEPARTMENTS[10] },
] as const;

function json(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (process.env.DEMO_SEEDING_ENABLED !== "true") return json("Demo account creation is disabled on this deployment.", 404);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json("Request origin is not allowed.", 403);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!url || !publishableKey || !secretKey || password !== "12345678") {
    return json("Demo seeding is not fully configured. Ask the project owner to check the server environment variables.", 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return json("Sign in as an administrator to create demo data.", 401);

  const verifier = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await verifier.auth.getUser(accessToken);
  if (authError || !authData.user) return json("Your session could not be verified. Sign in again and retry.", 401);

  const service = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actorProfile, error: actorError } = await service.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (actorError || actorProfile?.role !== "admin") return json("Only a signed-in portal administrator can create demo data.", 403);
  const { data: admins, error: adminsError } = await service.from("profiles").select("id").eq("role", "admin");
  if (adminsError || admins?.length !== 1 || admins[0]?.id !== authData.user.id) {
    return json("Demo setup requires this signed-in account to be the portal's only administrator.", 409);
  }

  const emailList = demoPeople.map((person) => person.email);
  const { data: existingProfiles, error: profilesError } = await service.from("profiles").select("id, email").in("email", emailList);
  if (profilesError) return json("Unable to look up existing demo accounts. Confirm the database migrations have been run.", 500);

  const profileByEmail = new Map((existingProfiles ?? []).map((profile) => [profile.email.toLowerCase(), profile.id]));
  const accountIds = new Map<string, string>();

  // Verify all existing addresses are ours before changing any password or profile.
  for (const person of demoPeople) {
    const existingId = profileByEmail.get(person.email.toLowerCase());
    if (!existingId) continue;
    const { data, error } = await service.auth.admin.getUserById(existingId);
    if (error || data.user?.user_metadata?.is_demo_user !== true) {
      return json("A reserved demo email is already in use by a non-demo account. Contact the project owner.", 409);
    }
    accountIds.set(person.email, existingId);
  }

  for (const person of demoPeople) {
    let id = accountIds.get(person.email);
    if (!id) {
      const { data, error } = await service.auth.admin.createUser({
        email: person.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: person.name, is_demo_user: true },
      });
      if (error || !data.user) {
        console.error("Demo auth user creation failed", error?.message);
        return json("Could not create the demo accounts. Check Supabase Auth and database logs.", 500);
      }
      id = data.user.id;
      accountIds.set(person.email, id);
    } else {
      const { error } = await service.auth.admin.updateUserById(id, { password, email_confirm: true, user_metadata: { full_name: person.name, is_demo_user: true } });
      if (error) {
        console.error("Demo auth user refresh failed", error.message);
        return json("Could not prepare the demo sign-in accounts. Check Supabase Auth logs.", 500);
      }
    }

    const { error: profileUpsertError } = await service.from("profiles").upsert({
      id,
      email: person.email,
      full_name: person.name,
      role: person.role,
      department: person.department,
    }, { onConflict: "id" });
    if (profileUpsertError) {
      console.error("Demo profile setup failed", profileUpsertError.message);
      return json("Demo accounts were created, but profile setup failed. Check the database migrations and try again.", 500);
    }
  }

  const faculty = demoPeople.filter((person) => person.role === "faculty");
  const futureDate = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const hodByDepartment = new Map(demoPeople.filter((person) => person.role === "hod").map((person) => [person.department, accountIds.get(person.email)!]));
  const sampleRows = faculty.flatMap((person, index) => {
    const facultyId = accountIds.get(person.email)!;
    const definitions = [
      { key: "pending", leave_type: "cl", start_date: futureDate(7 + index), end_date: futureDate(7 + index), status: "pending", reason: `DEMO DATA: seed-v2 ${person.email} pending request. Family commitment; please review the coverage plan.` },
      { key: "approved", leave_type: "od", start_date: futureDate(18 + index), end_date: futureDate(19 + index), status: "approved", reason: `DEMO DATA: seed-v2 ${person.email} approved request. Attending an academic workshop.` },
      { key: "rejected", leave_type: "el", start_date: futureDate(-20 - index), end_date: futureDate(-19 - index), status: "rejected", reason: `DEMO DATA: seed-v2 ${person.email} rejected request. Sample historical record for dashboard review.` },
    ];
    return definitions.map((definition) => ({
      faculty_id: facultyId,
      leave_type: definition.leave_type,
      start_date: definition.start_date,
      end_date: definition.end_date,
      substitute: "Sample substitute faculty",
      reason: definition.reason,
      status: definition.status,
      reviewed_by: definition.status === "pending" ? null : hodByDepartment.get(person.department),
      reviewed_at: definition.status === "pending" ? null : new Date().toISOString(),
    }));
  });

  const markerList = sampleRows.map((row) => row.reason);
  const { data: existingRequests, error: requestReadError } = await service.from("leave_requests").select("reason").in("faculty_id", faculty.map((person) => accountIds.get(person.email)!)).in("reason", markerList);
  if (requestReadError) {
    console.error("Demo request lookup failed", requestReadError.message);
    return json("Unable to check existing sample requests. Confirm the database migrations have been run.", 500);
  }
  const existingMarkers = new Set((existingRequests ?? []).map((row) => row.reason));
  const rowsToInsert = sampleRows.filter((row) => !existingMarkers.has(row.reason));
  let insertedRequests: Array<{ id: string; faculty_id: string; reason: string }> = [];
  if (rowsToInsert.length) {
    const { data, error } = await service.from("leave_requests").insert(rowsToInsert).select("id, faculty_id, reason");
    if (error) {
      console.error("Demo leave request seeding failed", error.message);
      return json("Accounts were created, but sample requests could not be added. Confirm the leave schema and migrations.", 500);
    }
    insertedRequests = data ?? [];
  }

  // Include a few labeled example messages so the conversation interface has data to explore.
  const pendingRequests = insertedRequests.filter((row) => row.reason.includes("pending request"));
  if (pendingRequests.length) {
    const facultyHod = new Map(faculty.map((person) => [accountIds.get(person.email)!, hodByDepartment.get(person.department)!]));
    const messages = pendingRequests.flatMap((row) => [
      { leave_request_id: row.id, sender_id: row.faculty_id, body: "DEMO DATA: Could you confirm the substitute coverage for these dates?" },
      { leave_request_id: row.id, sender_id: facultyHod.get(row.faculty_id)!, body: "DEMO DATA: Thanks. Please add the final coverage details before approval." },
    ]);
    const { error } = await service.from("leave_messages").insert(messages);
    if (error) console.error("Demo conversation sample could not be added", error.message);
  }

  return Response.json({
    createdAccounts: demoPeople.map((person) => ({ name: person.name, email: person.email, role: person.role, department: person.department })),
    password,
    seededRequests: rowsToInsert.length,
    demoOnly: true,
  });
}
