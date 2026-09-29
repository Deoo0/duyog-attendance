# Duyog — choir attendance management

A responsive Next.js app with a maroon and cream design, built for one choir and its administrators.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase environment variables, the app runs in **demo mode** with 16 sample members and six rehearsals. Demo changes persist in this browser's localStorage. Demo data is never uploaded to Supabase. Clear the `duyog-demo-v1` localStorage key to reset it.

## Included

- Dashboard with calculated attendance, voice distribution, and upcoming rehearsals.
- Create, view, edit, delete, and search members; filter by voice part.
- Member profile dialogs with contact details, birthday, notes, photo, and attendance rate.
- JPG/PNG/WebP photo uploads (500 KB maximum), stored as data URLs in protected member records. Initials appear when a photo is not provided.
- Rehearsal CRUD with date, local time, venue, and notes.
- Present / Late / Absent / Excused attendance, bulk marking, explicit save, and unsaved-change protection.
- Attendance history and voice-level reports; member and attendance CSV exports with formula-injection protection.
- Responsive navigation, keyboard-accessible native dialogs, loading/error states, and delete confirmations.
- Supabase email/password sign-in and token refresh. Sessions are kept in sessionStorage for the current browser tab.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` **once** in its SQL editor. This creates members, rehearsals, attendance, and an administrator allowlist with row-level security. No anonymous user can access choir records.
3. In **Authentication → Users**, create an administrator with email and password (confirm the email). Disable public sign-ups if you do not need them.
4. Copy the administrator's Auth user UUID and run:

```sql
insert into public.choir_admins (user_id) values ('YOUR-AUTH-USER-UUID');
```

Repeat for each trusted administrator. All allowlisted administrators manage the same choir. Users cannot add themselves to the allowlist. This application does not support multiple isolated choirs.

5. Copy `.env.example` to `.env.local`. Set your project URL and **publishable or legacy anon key**. Never use a secret/service-role key in `NEXT_PUBLIC_` variables.
6. Restart the development server. Sign in using the administrator credentials. Live mode starts with an empty database.

Database access uses the Supabase REST API with the administrator's access token. Policies enforce the allowlist independently of the frontend. Photos inherit the member table's access policy; no public storage bucket is required. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Deploy on Vercel

1. Push this project to your Git repository and import it in Vercel.
2. Select the Next.js framework preset; default build command is `npm run build`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's project environment variables for the environments you use.
4. Deploy. Environment variable changes require a new deployment because public values are embedded at build time.
5. In Supabase Authentication URL Configuration, set Site URL to your deployed HTTPS URL.
6. Sign in and create your members and first rehearsal.

No credentials are included. The schema must be applied and an administrator provisioned before live access works. Live integration requires your project to verify; the local demo does not verify database connectivity.

## Attendance behavior

Attendance rate = (Present + Late) / (Present + Late + Absent). Excused and unmarked records are excluded; no eligible records displays a dash. Save attendance explicitly. Inactive members remain in historical reports and previously recorded registers; new registers list active members. Deleting a member or rehearsal cascades to related attendance; use Inactive to retain a member's history. Rehearsal times use the choir's local wall-clock time, without timezone conversion.

CSV exports include saved records only. Concurrent edits to the same record use the last saved value; reload to fetch other administrators' updates. This is a small-choir application; pagination, audit logs, password recovery UI, and realtime collaboration are not included.

## Checks

```sh
npm run lint
npm run build
```

## Update an existing database: optional member details
Run supabase/migrations/20260929_optional_member_details.sql in the Supabase SQL Editor before deploying this update. Only name and voice require user input. Status defaults to Active; email, phone, birthday, member-since date, photo, and notes are saved as null when left blank. Existing records are preserved. The Log out button is in the top bar on desktop and mobile in connected mode; demo mode has no authenticated session.

## Public recent attendance on the login page

For an existing database, run `supabase/migrations/20260929_public_recent_attendance.sql` in the Supabase SQL Editor, then deploy the updated app. New projects get the same function from `supabase/schema.sql`.

The logged-out page shows the latest rehearsal whose scheduled time has passed (Asia/Manila) and has at least one saved attendance record. It lists all members marked Present or Late, with name and voice part only, including historical attendees now marked inactive. A newer unrecorded or future rehearsal does not replace it. If the latest register has no attendees, it displays an empty list rather than falling back to an older rehearsal.

This summary is intentionally accessible without signing in. A parameterless, read-only Supabase function exposes only the rehearsal title/date/time and attending members' names/voices. Member IDs, photos, contact details, notes, absent/excused names, and other rehearsal history are not returned. Existing table RLS and grants remain unchanged. No service-role or secret key is needed. Search and voice filters operate on this limited result. Fetch failures never block administrator sign-in; the section offers a retry button. Refresh the page to fetch newly saved attendance.


## Weekly rehearsals and absence watch

Run `supabase/migrations/20260930_recurring_rehearsals_absence_watch.sql` in the existing Supabase project's SQL Editor, then redeploy. The updated `schema.sql` includes it for new projects. Existing rehearsals become **Regular** by default; edit any special practices to **Extra**, and cancelled dates to **Cancelled**, before relying on the streak report.

In **Rehearsals → New rehearsal**, enable **Repeat weekly**. Tuesdays and Thursdays are preselected; choose additional days if needed, set a start/end date and time, and create all sessions in one operation. The initial end date is eight weeks after the start; ranges up to one year are supported. Each date gets its own register automatically, so you only select a date and mark attendance. Records are never reused or overwritten between dates. Generation ends at your chosen end date; create another batch to extend the schedule. For different times on different weekdays, create one batch per time/day combination. A one-off Extra rehearsal can be added anytime.

Repeated batch submissions skip existing sessions with the same date, time, and type, including cancelled sessions. Each session can be edited/cancelled individually; changing one date does not change the whole batch. Cancel instead of delete when you need to preserve history. The batch RPC runs atomically under the existing administrator RLS policies.

**Attendance watch**, on both the public login page and administrator Overview, shows current absence streaks for active members and absent names/voices for each saved regular rehearsal. Four or more consecutive Absent marks show **Subject to removal review**. No member is automatically removed. Use the existing member status control to mark a reviewed member Inactive and retain history.

- Present, Late, and Excused each break the streak (as requested).
- Unmarked entries in a saved register break the streak; they are never inferred as absent.
- Entirely unrecorded rehearsals remain pending and are skipped until attendance is saved.
- Extra, cancelled, future, and pre-joining rehearsals do not contribute. Rehearsal times use Asia/Manila.
- Mark unmarked absent is an explicit bulk action that still requires **Save attendance**. It does not replace existing marks.
- Correcting saved attendance recalculates streaks. Inactive members remain in historical absence lists but are excluded from current removal-review flags.

The public RPC intentionally exposes names, voice parts, absence streaks, and regular rehearsal absence lists without login, as requested. Private profile data and direct table access remain protected. Login-page summaries update on refresh; dashboard summaries update immediately after a local save. Large admin datasets are fetched in pages so the Supabase default row cap does not truncate streak history.

Run the regression tests with Node 22.18+ or newer:

```sh
node --test tests/attendance-rules.test.mjs
```

The local checks do not execute migrations against your hosted Supabase project. Verify its public RPCs and administrator batch creation after applying the migration.
