# AGENTS.md — CORLIVA Care Coordinator Portal

Read this before changing anything. This app is a finished, approved design. Do **not** redesign it, restyle it, swap the layout, add Tailwind, add a UI kit, or "modernise" it. Only make the change you are asked for, in the same style.

## What this is
CORLIVA is a home care platform. This repo is the **Care Coordinator** web portal. The signed-in person is **Aisha Rahman**, Care Coordinator for **North Branch** of the agency "Royality Home Care". It is a clickable React prototype with built-in demo data. It shares its design system with the Agency Admin portal (`sadaqat786921/Corliva-agency-admin-portal`).

A Care Coordinator (from the BRD): manages intake, client onboarding, schedules, assignments, replacements and family requests. **No access** to pay rates, invoices, payroll, user management, agency settings, visit approval, overrides, or restricted investigations. They only see their own branch.

## Stack
- React 19 + Vite + TypeScript. Only extra packages: `react-router-dom` and `lucide-react`. Plain web app at the top level of the repo: `index.html` (with `<div id="root">`) and entry `src/main.tsx`. No backend, no API calls, no `.env`.
- `HashRouter` (keep it — the app must work from any static host and in Figma Make)
- Icons: `lucide-react` only
- Styling: plain CSS in `src/styles.css` using CSS variables. **No Tailwind, no CSS reset libraries, no styled-components.**
- Font: Inter, from the font files in `src/fonts` (`src/fonts/inter.css`, imported in `src/main.tsx`). No Google Fonts link.
- Images live in `public/images/` and are referenced with relative paths like `./images/corliva-logo-white.svg`

## Design system (mirrors the Figma file "Corliva", page "03 · Foundations & Components")
- Page background: brand blue `--bg-page #105CBC`. The sidebar sits directly on the blue.
- Sidebar: width 236px, white text and icons, uppercase section labels (11px semibold), nav items 44px tall. The **active item is a white pill** (radius 37px) with dark text `#292D32`.
- Main content: a rounded light panel `--bg-panel #F8F6F6`, radius 24px, with a white header bar (radius 8px, border `#E5EAF1`, height 59px).
- Cards: white, 1px border `#E5EAF1`, radius 12px.
- Primary action colour `--action-primary #0E66D4`. Status colours: success `#18794A`, warning `#9A5B00`, danger `#C0322B`, each with a soft background.
- Status is always a **word plus a colour** (chips), never colour alone.
- Every token is in `:root` at the top of `src/styles.css`. Use the variables; don't hard-code new colours.

## Writing style
The client is non-technical and over 50. Use short, plain English: "Find caregiver", "Send for approval", "No caregiver yet". No jargon.

## Rules that must keep working
- Only **North Branch** work is shown (`s.inBranch`). No branch switcher.
- **Blocking vs warning** when assigning (`src/data/schedule.ts → checkCaregiver`): blocking = not ready to work, not trained for the service, already on another visit at that time. Warnings = HR reminder, outside usual days/hours, over weekly hours, new to the client. **Coordinators cannot override** blocking rules — the screen tells them to ask a Care Supervisor.
- A client can only have visits planned when **Active** and with an **approved care plan** (`canSchedule`).
- **Care plans**: Coordinator writes the draft → "Send for approval" → Care Supervisor approves or sends back with comments → Coordinator fixes and resends. The approved version stays in use while a new one is being worked on. Every version is kept.
- **Family requests never change the schedule directly.** Approving opens the normal schedule step (change time / cancel / plan visit / change caregiver), which re-checks the caregiver.
- Putting a client **on hold** marks their upcoming visits **"Needs review"** (shown in Cover needed) — it never deletes them.
- **Uploading a document doesn't mean it's checked** (status "Not checked"). Replaced documents are kept.
- **Incidents**: the Coordinator reports and adds notes; the Care Supervisor owns, moves and closes them.
- Reasons are required for: putting a referral or client on hold, handing over a referral, skipping or going back a referral stage, declining, removing family app access, keeping a visit marked for review.
- Nothing is ever deleted. Every change is recorded in the record's history.

## Structure
```
src/
  styles.css               design tokens + all component styles
  data/seed.ts             demo data (dates relative to today; today's check-ins follow the real clock)
  data/store.tsx           app state (saved in sessionStorage), toasts, history, Reset demo data
  data/referrals.ts        referral stage rules (what's needed to move on)
  data/schedule.ts         assignment checks, live visit state, cover queue, canSchedule
  data/clients.ts          client set-up checklist, care plan helpers
  components/ui.tsx        Button, Field, Input, Select, Chip, Modal, Drawer, Tabs, Toggle, StatTile, AlertBanner, EmptyState, ...
  components/Shell.tsx     sidebar + header (search, branch, alerts, family requests, profile menu)
  components/VisitActions.tsx  AssignModal, CancelModal, ChangeTimeModal, NewVisitsModal (shared)
  pages/                   one file per menu item + ReferralDetail, ClientDetail, VisitDetail, CaregiverDetail, IncidentDetail, Auth
```

## Demo data
All data is sample data in `src/data/seed.ts`. Every change is saved in **sessionStorage**, so it survives a refresh in the same tab. **Reset demo data** is in the profile menu (top right) and at the bottom of Settings.

## Demo sign-in
Any email and any password → **Sign in** → security code **246810** → **Verify and sign in**. Opens **My work**.

## Detail screens (never side panels)
Every record opens on its **own full screen** with a back link to where you came from (`?from=`). Only small decisions (a reason, a confirmation, change time, cancel) use a pop-up.
- **Visit** `/visits/:id` (`VisitDetail.tsx`) — opened from Cover needed, Today's visits, Schedule, My work, a client, a caregiver, an incident or a family request. Shows: status and live state, caregiver (or **Find a caregiver** on the same screen — best matches first, red reasons for anyone who can't be assigned, Assign button per person; `?assign=1` opens it straight away), progress (planned → assigned → checked in → checked out), care plan tasks and instructions, notes (why not covered / what the caregiver said), client details (address, getting in, likes, emergency contact), visit details (repeats), change history. Actions: Change caregiver, Change time, Cancel visit, Keep as planned (for visits needing review).
- **Caregiver** `/caregivers/:id` (`CaregiverDetail.tsx`) — profile (view only): numbers (visits to come, hours this week vs limit, clients they know, ready to work), tabs **Profile** (when they usually work this week, next visits, phone/type/branch/trained for, readiness — no documents or pay), **Visits** (upcoming/past, click to open), **Clients** (clients they know, visits done, last and next visit). Button: See on schedule.
- **Incident** `/incidents/:id` (`IncidentDetail.tsx`) — progress tracker (Reported → Under review → Action required → Resolved → Closed, moved by the owner), what happened, notes and actions with an **Add note** box on the screen, who handles it (owner, target date), details with links to the client and caregiver, visits that day. Reporting an incident opens its screen.
- **Family request** `/requests/:id` (`Requests.tsx → RequestDetail`) — their request and what they'd like, the visit they mean (opens the visit), conversation with a message box on the screen (Send message / Ask and wait for reply / Add as their reply / Send answer and close), who it's from, how requests work. Actions: Approve & … (opens the schedule step), Decline (reason).
- **Referral** `/referrals/:id` and **Client** `/clients/:id` — as below.
- Old links (`?open=`, `?visit=`) redirect to these screens.

## Menu and main flows
- **My work** (`/`) — greeting banner, 4 numbers (visits today, cover needed, new family requests, my open referrals), **Needs you now** list (late check-ins, visits needing cover in the next 2 days, new family requests, care plans sent back, referral call-backs due, clients still being set up — each with an action button), today's visits, my referrals by stage, care plans to do, coming up (booked assessments). Buttons: New referral, Plan a visit.
- **Referrals** (`/referrals`, `/referrals/:id`) — board/list with "Mine" filter; **New referral** with duplicate check (name or phone against clients and referrals). Full referral screen: stage tracker, stage records (Enquiry, Qualification, Assessment booking + results, Decision), contact log, "to move on" checklist, **Put on hold** (reason + check-again date), hand over, close/decline, **Accept & make client** → creates the client, a **draft care plan from the assessment**, files the signed agreement, and opens the client.
- **Clients** (`/clients`, `/clients/:id`) — list with care plan status and set-up progress. Client screen tabs:
  - **Overview** — "Finish setting up" checklist (address, how to get in, emergency contact, signed service agreement, approved care plan, first visits), details (edit), emergency contacts, upcoming visits, history.
  - **Contacts** — add/edit people; emergency contact and representative flags; **family app**: invite (needs email), resend, remove access (reason).
  - **Care plan** — draft editor (services, tasks, instructions, goals, hours a week, review date) → Send for approval / Take back to edit; "Changes requested" shows the Supervisor's comment; Start a new version from the approved plan; all versions list.
  - **Documents** — upload (PDF/JPG/PNG/Word, max 10 MB, type, expiry), replace (old one kept), status Not checked / Checked / Replaced.
  - **Visits** — upcoming/past; **Plan visits** (disabled with the reason until the care plan is approved).
  - Header: Put on hold / Restart care (reason), Plan visits.
- **Family requests** (`/requests`) — New / Waiting for family / Done. Request types: change a visit time, cancel a visit, add an extra visit, change caregiver, question. Clicking a request opens the **request screen**.
- **Schedule** (`/schedule`) — week board (rows: "No caregiver yet" + each caregiver) and list; filters; **Plan visits** (one-off or weekly repeat with days + until date; optional caregiver, visits they can't do stay open). Clicking a visit opens the **visit screen**.
- **Cover needed** (`/cover`) — every upcoming visit needing attention: No caregiver, Caregiver not ready, Needs review, Late check-in. Grouped Today / Tomorrow / Next 7 days / Later. Clicking a row opens the **visit screen**; "Find caregiver" / "Send someone else" open it with the caregiver list showing; "Review" opens it for visits needing review.
- **Today's visits** (`/today`) — live: Needs you now (late, no caregiver), In progress, Coming up, Done; check-in/out times; Add update (what the caregiver said), Send someone else. Clicking a visit opens the **visit screen**.
- **Caregivers** (`/caregivers`) — view only (HR keeps records): type, trained for, usual days/hours, hours booked this week, readiness. Clicking a caregiver opens their **profile screen**.
- **Incidents** (`/incidents`) — report an incident (client, caregiver involved, type, severity, date, what happened) → goes to the Care Supervisor and opens the **incident screen**; open/resolved/closed tabs; clicking an incident opens its screen.
- **Settings** — profile, password, Reset demo data.

## Other roles
- **HR Officer** — own portal: `sadaqat786921/Corliva-hr-officer-portal` (employment, requirements and checks, time off, ready to work; changes flag the caregiver's upcoming visits for the coordinator).
- **Director of Nursing** — built in its own portal: `sadaqat786921/Corliva-don-portal` (can do everything a Care Supervisor does, for the whole agency, plus clients' health, quality and risk, staff reviews and training).
- **Caregiver** — own portal: `sadaqat786921/corliva-caregiver-portal` (phone-friendly: their visits, check in and out, tasks, notes, sending the visit record, reporting a problem, sending documents to HR).
- **Finance Officer** — own portal: `sadaqat786921/corliva-finance-officer-portal` (bills approved visits, records payments, money owed, timesheets and payroll exports; applies adjustments asked for after invoicing).
- **Client & Family** — own portal: `sadaqat786921/corliva-client-family-portal` (phone-friendly: visits, checked visit summaries, care plan in use, shared documents, updates, change requests to the coordinator).

## Run
```
npm install
npm run dev     # preview
npm run build   # must finish with no errors
```
