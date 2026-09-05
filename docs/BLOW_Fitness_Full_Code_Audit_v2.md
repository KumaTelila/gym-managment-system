# BLOW FITNESS SYSTEM — End-to-End Audit (Business Functionality + Code)

- **Repository:** git@github.com:KumaTelila/gym-managment-system.git
- **Commit audited:** `d15d40e` (branch: main, 8 commits, last: "fix(upload): use data URLs on Vercel to prevent EROFS read-only error")
- **Audit date:** 5 September 2026
- **Audit type:** Full static review — source code read directly from the cloned repository (not a summary of docs). Supersedes the earlier `docs/BLOW_Fitness_Code_Audit_Report.md`, which reviewed an earlier, much smaller snapshot (8 files). This pass reviewed all 70+ source files: every API route, the Prisma schema, session/auth layer, dashboard pages, and deployment configuration.

**Executive assessment:** The codebase has grown well past the original SRS — it now includes gym tabs (pay-on-exit), open-tab settlement at checkout, master-data management, a real audit log viewer, role-based page guards, and Docker/Vercel deployment tooling. Several of the previous audit's P0 findings are genuinely fixed (signed session cookies, atomic locker allocation on check-in, parallelized dashboard queries). However, new and recurring issues mean this is **still not production-ready**: a hardcoded session-secret fallback that is public in this repo, a real financial-integrity gap where staff-submitted prices are trusted for subscriptions and locker rentals, an order-number race condition, and an inconsistently-applied concurrency fix (the locker-race fix from check-in was not carried over to the rentals endpoint).

---

## 1. Scope and Method

Reviewed directly from the cloned repository: every route under `src/app/api/`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/session.ts`, `src/lib/audit.ts`, dashboard pages and their layout guards, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, and the deployment docs. No live database or running deployment was accessed; this is a static read of the source as committed.

## 2. Severity Classification

| Severity | Meaning | Release guidance |
|---|---|---|
| P0 / Critical | Security, unauthorized access, data corruption or major financial-integrity risk. | Must fix before production. |
| P1 / High | Serious functional, authorization or consistency weakness. | Fix before production. |
| P2 / Medium | Important reliability, performance or maintainability issue. | Fix before or immediately after controlled pilot. |
| P3 / Low | Quality, UX or maintainability improvement. | Backlog / continuous improvement. |

## 3. Findings Summary

| ID | Severity | Finding | Area |
|---|---|---|---|
| F-01 | P0 | Session HMAC secret falls back to a hardcoded string that is public in this repo if `SESSION_SECRET` is unset at runtime. | Authentication |
| F-02 | P0 | Subscription and locker-rental prices are trusted from the client request instead of being read from `SubscriptionPlan`/settings server-side. | Financial integrity |
| F-03 | P1 | Duplicate active check-in per member is still a check-then-create race — no DB-level unique constraint backs the in-transaction check. | Concurrency / DB |
| F-04 | P1 | Locker-rental creation reintroduces the exact locker double-booking race that was fixed in the check-in endpoint. | Concurrency / DB |
| F-05 | P1 | Card-version check on check-in is optional — omitting it from the request bypasses lost-card invalidation, same as before. | Access control |
| F-06 | P1 | `SO-YYYY-#####` sales order numbers are generated via `count()`, not atomically — concurrent POS checkouts can collide. | Concurrency / DB |
| F-07 | P1 | Demo staff accounts (`admin`/`admin123`, `manager`/`mgr123`, `reception`/`rec123`) are created unconditionally by `seed.ts` with no environment gate; only the UI quick-login buttons are hidden in production. | Deployment / Security |
| F-08 | P1 | Charged fees (card-replacement 100 ETB, locker-rental extension) are written to the audit log only — never turned into a `SalesOrder`, so they never appear in revenue/cash-reconciliation reporting. | Financial integrity / Reporting |
| F-09 | P2 | SVG is an accepted upload MIME type for member photos; SVG can carry embedded scripts (stored-XSS risk) and file `type` is client-supplied and unverified server-side. | Security |
| F-10 | P2 | Member code generation (`BF-####`) uses `count()`, which races the same way as the order-number issue. | Concurrency / DB |
| F-11 | P2 | Several state-changing endpoints (subscriptions, locker rentals, locker status, rental termination) authenticate with `getSession()` only, with no `requireRole()` check, unlike check-in/checkout/POS. | Authorization |
| F-12 | P2 | `AuditLog.detailsJson` is still a `String?`, not native JSON/JSONB; `ipAddress` is captured in the schema but never populated by any call site. | Auditability |
| F-13 | P2 | Manually forcing a locker to `AVAILABLE`/`MAINTENANCE` via `/api/lockers/[id]/status` doesn't check for an active check-in session or rental using that locker, and isn't audit-logged. | Data integrity |
| F-14 | P2 | Raw `error.message` (including underlying Prisma error text) is returned to the client on nearly every route's catch block. | Information disclosure |
| F-15 | P2 | Monthly `RESERVED` lockers and daily check-in `OCCUPIED` lockers share one `status` field with no explicit reconciliation rule — a renter's own daily check-in can flip their reserved locker back to `AVAILABLE` on checkout. | Business logic |
| F-16 | P3 | No security headers configured in `next.config.ts` (CSP, X-Frame-Options, X-Content-Type-Options, HSTS). | Hardening |
| F-17 | P3 | No login rate limiting / brute-force throttling on `/api/auth/login`. | Security |
| F-18 | P3 | `medicalHistory` and other sensitive member fields are returned in full to any authenticated staff member regardless of role. | Data governance |

---

## 4. Detailed Findings

### F-01. Hardcoded session-secret fallback — P0 / Critical
**File:** `src/lib/session.ts:13-14`
```ts
const SESSION_SECRET =
  process.env.SESSION_SECRET || "blow-fitness-session-secret-salt-2026-production-ready";
```
**Problem:** If `SESSION_SECRET` isn't set in the deployment environment, the app silently signs session cookies with this literal string — which is committed in a public GitHub repository.

**Why it matters:** This is worse than an unsigned cookie (the previous audit's AUD-001), because the current code *looks* secure (HMAC-SHA256, `timingSafeEqual`) while the key protecting it can be read by anyone on GitHub. The deployment docs (`docs/VERCEL_NEON_DEPLOYMENT.md`, `docs/DEPLOYMENT_STRATEGY.md`) correctly instruct generating a random secret, and `docker-compose.yml` passes `${SESSION_SECRET}` through with no default — but nothing in the *application* enforces this. A deployer who forgets the env var (a one-time Vercel dashboard step, easy to miss) gets a fully working app with forgeable sessions for any user, including ADMIN.

**Recommended fix:** Throw at startup (or on first `getSession`/`createSessionToken` call) if `process.env.SESSION_SECRET` is unset or shorter than, say, 32 bytes. Never ship a functional fallback for a cryptographic secret — fail loud, not quiet.

### F-02. Client-trusted pricing on subscriptions and locker rentals — P0 / Critical
**Files:** `src/app/api/subscriptions/route.ts:88`, `src/app/api/rentals/route.ts:42,74`, `src/app/api/rentals/[id]/extend/route.ts:18`

```ts
amountPaidETB: amountPaidETB !== undefined ? amountPaidETB : plan.priceETB,
```
```ts
const { memberId, lockerId, durationDays = 30, priceETB = 500, paymentMethod, paymentRef } = await request.json();
...
priceETB,   // written straight into LockerRental.priceETB
```

**Problem:** The POS checkout route does this correctly — it always recalculates `totalAmountETB` server-side from `product.sellingPriceETB` inside the transaction, never trusting a client-submitted total. Subscriptions and locker rentals don't follow the same rule: `amountPaidETB` for a subscription payment, and `priceETB` for a locker rental (including its extension), are taken directly from the request body if present.

**Why it matters:** Any authenticated staff account (this isn't even role-gated to ADMIN, see F-11) can submit a request that charges a member 1 ETB for an 22,000 ETB "Annual Gold" plan, or records an arbitrary number as `amountPaidETB` that has no relationship to what was actually collected at the desk. This is the single most exploitable path to revenue leakage in the system — it doesn't require a bug, just a modified request from the already-authenticated front-desk browser session (open devtools, resend with a different number).

**Recommended fix:** For subscriptions, always set `amountPaidETB: plan.priceETB` server-side (or a well-defined discount workflow with its own authorization and audit trail, never a free-text override). For locker rentals, add a `LockerRentalPlan`-style master-data price (the codebase already has this pattern for `master-data/plans`) and read the fee from there, not from the request body.

### F-03. Duplicate active check-in remains a race — P1 / High
**File:** `src/app/api/checkin/route.ts:96-113`

**Problem:** Inside the transaction, the code does a `findFirst` for an existing ACTIVE session, then later `create`s a new one. This is exactly what the previous audit's AUD-002 flagged. The code comment says `// Check for existing active check-in inside the transaction (AUD-002)`, but being *inside* a transaction doesn't fix a check-then-act race under Postgres's default READ COMMITTED isolation — two concurrent transactions can both read "no active session" before either commits its `create`. Compare this to the locker allocation three lines below it, which correctly uses an atomic conditional `updateMany` — the member-uniqueness check doesn't get the same treatment.

**Why it matters:** Two receptionists (or a double-tap on a slow connection) can still check the same member in twice concurrently, exactly as before. The schema has an ordinary index (`@@index([memberId, sessionStatus])`) but no partial unique index.

**Recommended fix:** Add a Postgres partial unique index:
```sql
CREATE UNIQUE INDEX uniq_active_checkin_per_member
  ON "CheckinSession" ("memberId") WHERE "sessionStatus" = 'ACTIVE';
```
and catch the resulting unique-violation as a 409, the same way the locker branch already handles its own conflict.

### F-04. Locker-rental race reintroduces the fixed check-in bug — P1 / High
**File:** `src/app/api/rentals/route.ts:49-65`

**Problem:** Availability is checked with a plain `findUnique` *before* the transaction, then the transaction does a plain `update` (not the atomic conditional `updateMany` pattern used in `checkin/route.ts`). This is precisely the locker-race pattern (previously AUD-003) that was correctly fixed for daily check-in but was never applied to monthly rentals.

**Why it matters:** Two simultaneous monthly-rental requests for the same locker can both pass the check and both succeed, producing two active `LockerRental` rows pointed at one physical locker.

**Recommended fix:** Mirror the check-in fix exactly:
```ts
const lockerUpdate = await tx.locker.updateMany({
  where: { id: lockerId, status: "AVAILABLE" },
  data: { status: "RESERVED" },
});
if (lockerUpdate.count === 0) throw new Error("Locker no longer available");
```

### F-05. Card-version check remains optional — P1 / High
**File:** `src/app/api/checkin/route.ts:67-73`

**Problem:** `if (cardVersion !== undefined && cardVersion !== null)` — a check-in request that simply omits `cardVersion` skips the comparison entirely. This is the same bypass the previous audit's AUD-006 described; the code comment claims it's addressed, but the logic is unchanged from before.

**Why it matters:** The whole point of `cardVersion` is to invalidate a lost/replaced physical card. If the front-desk app (or a raw request) can check a member in with just `memberCode` and no `cardVersion`, a found "lost" card still works forever.

**Recommended fix:** Decide explicitly: either every card-based check-in must include `cardVersion` and reject if missing, or introduce a distinct "manual override" code path that requires an elevated role and is clearly audit-logged as a manual override (not a normal card check-in).

### F-06. Sales order number collision under concurrency — P1 / High
**File:** `src/app/api/pos/checkout/route.ts:97-98`
```ts
const orderCount = await tx.salesOrder.count();
const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, "0")}`;
```
**Problem:** Even though this runs inside the same transaction as the rest of the checkout, `count()` then use is not atomic against another concurrent transaction doing the same count — both can compute the same `orderCount` before either commits. `orderNumber` has a `@unique` constraint, so the second POS checkout raises a raw Prisma unique-constraint exception, which surfaces to the cashier as a generic 500 error (see F-14) rather than a clean retry.

**Why it matters:** Under real traffic (multiple POS terminals during a busy hour), this WILL eventually collide and fail a legitimate, in-progress sale — after stock has already been decremented inside the same transaction, so the whole transaction (correctly) rolls back, but the cashier just sees "Error processing sale" with no indication of what to do.

**Recommended fix:** Use a Postgres sequence for the numeric suffix, or generate the order number from the row's own auto-incrementing identity after insert, or catch the unique-violation specifically and retry with an incremented counter.

### F-07. Demo credentials remain live in the backend — P1 / High
**Files:** `prisma/seed.ts:9-40`, `src/components/login-form.tsx:85`

**Problem:** `seed.ts` unconditionally `upsert`s `admin`/`admin123`, `manager`/`mgr123`, `reception`/`rec123`. The **frontend** quick-login buttons are correctly hidden in production (`process.env.NODE_ENV !== "production"`), but that only hides the UI — it does nothing to the backend. If seeding is ever run against a production database (a very plausible first-deploy step), these accounts exist with public, well-known passwords and can log in directly via `POST /api/auth/login` regardless of what the UI shows.

**Why it matters:** This is a full-privilege (ADMIN) backdoor whose credentials are published in this very repository. Hiding the button is a cosmetic fix to what is a backend problem.

**Recommended fix:** Gate the seed script itself: `if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) throw new Error(...)`. Force a password change on first login for any seeded account. Never rely on frontend visibility as a security control.

### F-08. Fees logged but never billed — P1 / High
**Files:** `src/app/api/members/[id]/replace-card/route.ts:18,43`, `src/app/api/rentals/[id]/extend/route.ts:18,61`

**Problem:** The 100 ETB card-replacement fee and locker-rental extension fee are both written into `AuditLog.detailsJson` as a JSON field (`feeETB` / `priceETB`) but **no `SalesOrder` is ever created** for either charge.

**Why it matters:** `reports/cash` and `reports/sales` compute revenue from `SalesOrder` rows only. These two fee types are structurally invisible to cash reconciliation and sales reporting — the front desk can tell a member "that'll be 100 birr" and there is nothing enforcing that it was actually collected, and even if it was, it will never show up in the daily till count. This directly undermines the "Daily Cashier Drawer Reconciliation" requirement from the original SRS.

**Recommended fix:** Both endpoints should create a real `SalesOrder` (with an appropriate order type or a dedicated `entityType`) inside the same transaction as the card/rental change, exactly like `subscriptions` and `pos/checkout` do for their respective charges.

### F-09. SVG accepted as a member-photo upload type — P2 / Medium
**File:** `src/app/api/upload/route.ts:32,59-61`

**Problem:** `file.type.startsWith("image/")` accepts `image/svg+xml`, and the extension/MIME mapping explicitly branches for `svg`. `file.type` on a `File` object is client-supplied and trivially spoofable in a raw multipart request; there's no server-side content sniffing or SVG sanitization.

**Why it matters:** SVG is executable content in a browser context — an uploaded "photo" containing `<script>` can run when the member's photo is rendered inline anywhere in the dashboard, which is a classic stored-XSS vector against staff sessions (staff sessions that, per F-01/F-11, may already carry more privilege than intended).

**Recommended fix:** Drop SVG from the accepted set for user-photo uploads, or sanitize with a dedicated SVG sanitizer before storage, and validate actual file content (magic bytes) server-side rather than trusting the reported MIME type.

### F-10. Member code generation races the same way as F-06 — P2 / Medium
**File:** `src/app/api/members/route.ts:142-143`

Same `count()`-then-format pattern as the sales order number. Lower urgency than F-06 because front-desk registrations happen less concurrently than POS checkouts, but the failure mode is identical: two simultaneous registrations can compute the same `BF-####` code, and the second `create()` fails on the `@unique` constraint with a raw error surfaced to the receptionist. Same fix approach as F-06.

### F-11. Inconsistent authorization — P2 / Medium
**Files:** `src/app/api/subscriptions/route.ts`, `src/app/api/rentals/route.ts`, `src/app/api/rentals/[id]/extend|terminate/route.ts`, `src/app/api/lockers/[id]/status/route.ts`

**Problem:** `checkin`, `checkout`, and `pos/checkout` all use `requireRole(...)` to restrict which roles can perform the action. Subscriptions, locker rentals (create/extend/terminate), and manual locker status changes use only `getSession()` — any authenticated role, including one with no financial authority, can process membership payments, rent lockers at an arbitrary price (see F-02), or force a locker's status.

**Why it matters:** Authentication and authorization are different guarantees; several money-moving and state-changing endpoints only prove the caller is *some* logged-in staff member, not that they're allowed to do *this specific* thing. Combined with F-02, this means the role model defined in the schema (`ADMIN`, `FINANCE_OWNER`, `RECEPTIONIST`) isn't actually enforced at the points where it matters most for financial integrity.

**Recommended fix:** Apply `requireRole()` consistently across every state-changing endpoint, deciding deliberately which roles should be allowed to create subscriptions/rentals (probably RECEPTIONIST + ADMIN) versus which should be restricted to ADMIN/FINANCE_OWNER (price overrides, if any override capability is kept at all).

### F-12. Audit log still unstructured, IP never captured — P2 / Medium
**File:** `prisma/schema.prisma:286-300`, `src/lib/audit.ts`

`AuditLog.detailsJson` remains `String?` (serialized JSON) rather than a native `Json`/`Jsonb` column, and while the schema has an `ipAddress` field, no call site anywhere in the codebase (`grep` across all `logAudit`/`auditLog.create` calls) ever passes one. This was flagged before (AUD-011) and is functionally unchanged — details are harder to query than they need to be, and there's no request-origin trail at all for any audited action.

**Recommended fix:** Migrate `detailsJson` to `Json` and pass `ipAddress` from the request (`request.headers.get("x-forwarded-for")` behind Caddy) at every call site, ideally by wrapping `logAudit` so callers can't forget it.

### F-13. Manual locker status override bypasses occupancy checks — P2 / Medium
**File:** `src/app/api/lockers/[id]/status/route.ts`

Forcing a locker to `AVAILABLE` doesn't check whether an active `CheckinSession` or `LockerRental` currently references it, and the change isn't audit-logged at all (unlike almost every other mutating endpoint in the codebase). A staff member could free a locker that a member is actively using, opening the door to the exact double-assignment scenario the atomic locker logic elsewhere is designed to prevent.

**Recommended fix:** Reject the transition to `AVAILABLE` if an active session/rental still references the locker (or force-release them explicitly as part of the same action), and add an audit log entry consistent with the rest of the codebase.

### F-14. Raw error messages returned to clients — P2 / Medium
**Pattern across nearly every route**, e.g. `src/app/api/pos/checkout/route.ts:145-148`:
```ts
return NextResponse.json(
  { error: error instanceof Error ? error.message : "Error processing sale" },
  { status: 500 }
);
```
Since Prisma errors are `Error` instances, this forwards raw Prisma error text (which can include table/column names and constraint identifiers) straight to the browser. Low exploitability on its own, but it's unnecessary information disclosure and makes it harder to give receptionists a clean, actionable message ("this locker was just taken" vs. a stack-trace-flavored string).

**Recommended fix:** Log the real error server-side (already happening via `console.error`) and return a small set of known, friendly error strings to the client; reserve `error.message` passthrough for errors you've deliberately thrown yourself (as the check-in route already does for its own business-rule errors).

### F-15. Reserved vs. occupied locker states aren't reconciled — P2 / Medium
**Files:** `prisma/schema.prisma` (`Locker.status`), `src/app/api/checkin/route.ts`, `src/app/api/checkin/[id]/checkout/route.ts`

A locker has one `status` field. A member with an active monthly `LockerRental` (status `RESERVED`) who also does a normal daily check-in and gets assigned *that same locker* will flip it to `OCCUPIED` on check-in and back to `AVAILABLE` on checkout (`checkout/route.ts:102-107` unconditionally sets `AVAILABLE`) — silently dropping the `RESERVED` state and releasing a locker that's still under an active paid rental. This is the same architectural gap flagged in the very first review of the original SRS design, and it's still unresolved in the shipped schema.

**Recommended fix:** Checkout should check for an active `LockerRental` on the same locker before setting `AVAILABLE`, and restore `RESERVED` instead if one exists.

### F-16 – F-18 (P3, brief)
- **F-16:** No CSP/`X-Frame-Options`/`X-Content-Type-Options`/HSTS headers configured anywhere (`next.config.ts` only toggles `output: standalone`). Consider adding these via `next.config.ts` headers or the Caddy layer.
- **F-17:** No rate limiting on `/api/auth/login` — a scripted credential-stuffing attempt against the (public, since this is an open-source repo) known demo usernames has no built-in slowdown.
- **F-18:** `medicalHistory`, `bloodGroup`, `idNumber`, and similar fields are returned in full on every member fetch to any authenticated role. Worth a deliberate decision on whether RECEPTIONIST-level staff should see medical history at all, versus ADMIN/FINANCE_OWNER-only, given this is sensitive personal data about real people.

---

## 5. Business Functionality Review (vs. Original SRS)

The build has substantially outgrown the original five-module SRS — this is a genuine strength, not scope creep for its own sake:

| SRS Module | Status | Notes |
|---|---|---|
| Member registration & profiles | ✅ Implemented, expanded | Adds medical history, blood group, ID number, fitness goals beyond the original spec. |
| Front-desk check-in / card custody | ✅ Implemented, expanded | Card-version invalidation, informative expiry messaging, atomic locker allocation. |
| Locker & key management | ✅ Implemented, gap remains | Daily assignment is solid; monthly-rental reconciliation (F-15) and rental-creation concurrency (F-04) still need work. |
| POS & inventory | ✅ Implemented, expanded | Adds "gym tabs" (pay-on-exit) beyond the original spec — genuinely useful, not in the SRS at all. Server-side price authority is correct here (unlike subscriptions/rentals, F-02). |
| Financial & operational analytics | ⚠️ Partially reliable | Dashboard KPIs are now correctly computed (parallel queries, bounded date ranges); but cash/sales reports will undercount real revenue because of F-08 (unbilled fees) and can be manipulated via F-02 (client-trusted pricing). |
| Staff roles & permissions | ⚠️ Defined but inconsistently enforced | Three roles exist and page-level guards are correct; API-level enforcement is inconsistent (F-11). |
| Audit trail | ✅ Implemented, expanded | A real audit log viewer with filtering/pagination exists (not in the original SRS) — good addition, but see F-12 for structural gaps. |

Additions beyond the original SRS that are worth calling out positively: gym tabs with settle-on-exit, a master-data admin section (plans/products/lockers/payment accounts), system settings, Docker + Vercel/Neon deployment paths with a health-check endpoint, and Ethiopian-calendar support (`src/lib/ethiopian-calendar.ts`).

## 6. Production Readiness Checklist

| Area | Assessment | Required before go-live |
|---|---|---|
| Authentication | Needs remediation | Fail loudly if `SESSION_SECRET` is unset (F-01); no other issues found in the signing/verification logic itself. |
| Financial integrity | **Needs remediation — highest priority** | Server-side authoritative pricing for subscriptions and rentals (F-02); bill card-replacement and rental-extension fees as real orders (F-08). |
| Authorization | Needs remediation | Apply `requireRole()` consistently (F-11). |
| Concurrency / DB | Needs remediation | Partial unique index for active check-ins (F-03); atomic locker update in rentals (F-04); safe order/member-code numbering (F-06, F-10). |
| Locker/rental business rules | Needs remediation | Reconcile `RESERVED` vs `OCCUPIED` (F-15); guard manual status overrides (F-13). |
| Deployment hygiene | Needs remediation | Gate or remove seed demo accounts in any environment that could become production (F-07). |
| File upload | Needs remediation | Drop or sanitize SVG (F-09). |
| Auditability | Partially implemented | Structured JSON + IP capture (F-12). |
| Dashboard performance | ✅ Ready | Parallelized, count-based, correctly bounded — no further action needed. |
| Error handling | Needs improvement | Stop forwarding raw error text (F-14). |
| Hardening | Backlog | Security headers, login rate limiting (F-16, F-17). |

## 7. Recommended Remediation Plan

1. **Phase 1 — Money and secrets (do first):** Fix F-01 (fail-fast secret) and F-02 (server-side pricing for subscriptions/rentals) — these are the two findings with direct, immediate financial/security exposure.
2. **Phase 2 — Concurrency correctness:** F-03 (partial unique index + retry), F-04 (atomic locker update in rentals), F-06 and F-10 (safe numbering schemes).
3. **Phase 3 — Close the billing gaps:** F-08 (real orders for card replacement / rental extension fees), so cash reconciliation reflects reality.
4. **Phase 4 — Authorization pass:** F-05 (enforce card-version), F-11 (consistent `requireRole`), F-13 (guard manual locker overrides).
5. **Phase 5 — Hardening:** F-07 (gate seed data), F-09 (SVG upload), F-14 (error messages), F-16/F-17 (headers, rate limiting).
6. **Phase 6 — Data model cleanup:** F-12 (JSONB + IP), F-15 (reserved/occupied reconciliation), F-18 (field-level access review for sensitive member data).

## 8. Recommended Test Matrix

- Two simultaneous check-ins for the same member → exactly one ACTIVE session (currently would likely fail — see F-03).
- Two simultaneous locker-rental requests for the same locker → exactly one succeeds (currently would likely fail — see F-04).
- Two simultaneous POS checkouts as the last transaction of the day → both get distinct order numbers, no 500 (currently would likely fail — see F-06).
- Submit a subscription request with a tampered `amountPaidETB` far below `plan.priceETB` → rejected or ignored server-side (currently succeeds as submitted — see F-02).
- Upload an SVG containing a `<script>` tag as a member photo → rejected (currently accepted — see F-09).
- Deploy with `SESSION_SECRET` unset → app should refuse to start or refuse to issue sessions (currently starts fine with the hardcoded fallback — see F-01).
- Log in as `admin`/`admin123` against a freshly-seeded "production" database → should fail (currently succeeds — see F-07).
- Force a locker to `AVAILABLE` while a member is actively checked in with that locker → should be rejected (currently succeeds — see F-13).

## 9. Positive Findings

- Genuine, correct fixes since the last audit: signed session cookies with `timingSafeEqual` comparison, atomic conditional locker allocation on check-in, parallelized dashboard queries with dedicated `count()` calls, accurately bounded expiring-subscription window.
- POS checkout does price/stock integrity correctly: server-side price lookup, atomic conditional stock decrement, stock-movement ledger entries, and a real order created inside the transaction.
- Page-level role guards exist and are correctly checked (`users`, `settings`, `audit`, `master-data` layouts all redirect non-privileged roles).
- A real, filterable, paginated audit-log viewer exists — a genuinely useful addition beyond the original scope.
- Sensible operational extras: a health-check endpoint for container orchestration, documented Vercel/Neon and Docker/Caddy deployment paths, and Ethiopian-calendar support.
- Demo credentials are at least hidden from the production UI, even though the backend gap (F-07) remains.

## 10. Final Audit Conclusion

**Overall status: NOT PRODUCTION READY.** The system has matured significantly since the last review — several previously-critical issues are genuinely resolved, and real, useful functionality (gym tabs, master data, audit viewer) has been added on top of the original spec. But this pass surfaced a new P0 (the hardcoded session-secret fallback, which is worse than the original forgeable-cookie issue because it's silent) and confirmed that the fix pattern used correctly in one place (atomic conditional updates in check-in) was not applied consistently to a structurally identical problem elsewhere (locker rentals). The most consequential gap for a business handling real cash and real memberships is F-02: nothing currently stops a staff account from recording a different amount than what a member actually paid for a subscription or a locker rental.

**Recommended release gate:** Do not deploy to a real facility until F-01 and F-02 are fixed and verified with the concurrency test matrix in Section 8. Everything else in Phases 2 onward can reasonably follow in a fast-tracked series of patches during a controlled pilot, provided F-01/F-02 are closed first.
