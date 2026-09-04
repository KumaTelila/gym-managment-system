# BLOW FITNESS SYSTEM — Code Audit & Production Readiness Report

- **Repository:** KumaTelila/gym-managment-system
- **Branch audited:** main
- **Audit date:** 4 September 2026
- **Audit type:** Static application/security/data-integrity audit

**Executive assessment:** The current implementation has progressed beyond the earlier starter-stage snapshot and contains meaningful domain functionality, Prisma/PostgreSQL modeling, authentication, check-in, locker, POS and audit-log foundations. However, it should not be considered production-ready until the authentication/session design, authorization boundaries, concurrency controls, subscription selection, and financial/inventory integrity controls are strengthened.

# 1. Scope and Method

The audit reviewed the current main branch through the repository source available during the review, with emphasis on security, authentication, authorization, database integrity, concurrency, business rules, POS/inventory risks, Next.js architecture, validation, performance, and production readiness. The audit is primarily static: no production database was accessed and the GitHub connector does not provide a full local build/test execution environment in this review.

Key files directly inspected:

- src/lib/session.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/checkin/route.ts
- src/app/dashboard/page.tsx
- src/app/login/page.tsx
- prisma/schema.prisma
- prisma/seed.ts
- package.json
- .gitignore

# 2. Severity Classification

| Severity | Meaning | Release guidance |
|---|---|---|
| P0 / Critical | Security, unauthorized access, data corruption or major financial-integrity risk. | Must fix before production. |
| P1 / High | Serious functional, authorization or consistency weakness. | Fix before production. |
| P2 / Medium | Important reliability, performance or maintainability issue. | Fix before or immediately after controlled pilot. |
| P3 / Low | Quality, UX or maintainability improvement. | Backlog / continuous improvement. |

# 3. Findings Summary

| ID | Severity | Finding | Primary area |
|---|---|---|---|
| AUD-001 | P0 / Critical | Session cookie is forgeable because it contains an unsigned Base64 user ID and expiry. | Authentication |
| AUD-002 | P0 / Critical | Check-in uniqueness is checked before the transaction; concurrent requests can create duplicate active sessions unless DB constraints exist. | Concurrency / DB |
| AUD-003 | P0 / Critical | Locker availability is checked before update; concurrent requests can race for the same locker. | Concurrency / DB |
| AUD-004 | P1 / High | Check-in API authenticates users but does not enforce role authorization. | Authorization |
| AUD-005 | P1 / High | Subscription selection uses latest endDate rather than selecting the currently valid subscription. | Business logic |
| AUD-006 | P1 / High | Card-version validation is optional, allowing memberCode-only check-in to bypass card replacement invalidation. | Access control |
| AUD-007 | P2 / Medium | Dashboard loads all active sessions only to calculate the count, creating unnecessary data transfer and memory use. | Performance |
| AUD-008 | P2 / Medium | Expiring-subscription KPI can include already expired subscriptions because it only applies an upper bound. | Reporting |
| AUD-009 | P2 / Medium | Dashboard database queries are sequential and can be parallelized. | Performance |
| AUD-010 | P2 / Medium | Seed script contains fixed demo passwords and creates demo users; production deployment must ensure seed data cannot reach production. | Deployment / Security |
| AUD-011 | P2 / Medium | Audit log stores details as String JSON instead of a structured JSON database field and lacks an explicit immutability strategy. | Auditability |
| AUD-012 | P2 / Medium | POS/inventory integrity requires atomic stock decrement and transaction boundaries; schema alone does not guarantee this. | Financial / Inventory |

## AUD-001. Forgeable authentication session — P0 / Critical

**File:** src/lib/session.ts

**Problem:** createSessionToken() encodes `${userId}:${expires}` with Base64, while getSession() decodes it and trusts the user ID. Base64 provides encoding, not authenticity.

**Why it matters:** An attacker who can influence the cookie value could potentially impersonate another active user by constructing a valid-looking token for that user's ID. This undermines every downstream authorization decision.

**Recommended fix:** Replace the custom token with a proven session system or a random opaque session identifier stored server-side. Use HttpOnly, Secure, SameSite cookies, server-side revocation, expiry, and rotation. Do not place the user ID in an unsigned bearer cookie.

## AUD-002. Duplicate active check-in race — P0 / Critical

**File:** src/app/api/checkin/route.ts + prisma/schema.prisma

**Problem:** The route first queries for an ACTIVE session and only later creates the session inside a transaction. The Prisma model has an index on memberId/sessionStatus but not a declared uniqueness constraint for ACTIVE rows.

**Why it matters:** Two simultaneous requests can both observe no active session and then create two active sessions for one member.

**Recommended fix:** Add a PostgreSQL partial unique index for ACTIVE sessions by memberId, or redesign the active-session state so a normal unique constraint can enforce it. Keep the check and create inside a transaction and handle unique-constraint conflicts as HTTP 409.

## AUD-003. Locker assignment race — P0 / Critical

**File:** src/app/api/checkin/route.ts

**Problem:** The route reads a locker and verifies status AVAILABLE, then later updates the locker to OCCUPIED. Another request can read the same AVAILABLE locker before the update commits.

**Why it matters:** Two members can be assigned the same physical locker under concurrent front-desk activity.

**Recommended fix:** Use an atomic conditional update or SELECT ... FOR UPDATE inside the transaction. Require the update to affect exactly one row. Add DB-level protection for an ACTIVE session per locker.

## AUD-004. Missing server-side role authorization — P1 / High

**File:** src/app/api/checkin/route.ts

**Problem:** The endpoint checks only whether getSession() returns a user. It does not restrict the operation by role.

**Why it matters:** Authentication proves identity; it does not prove permission. A Finance Owner or other authenticated account could invoke operations that should be restricted to reception/front-desk roles.

**Recommended fix:** Create reusable server-side authorization helpers such as requireRole('ADMIN','RECEPTIONIST'). Apply them to every state-changing endpoint, not only UI routes.

## AUD-005. Incorrect current-subscription selection — P1 / High

**File:** src/app/api/checkin/route.ts

**Problem:** The member query takes one subscription ordered by endDate descending, then treats it as the current subscription.

**Why it matters:** A future, cancelled, suspended or otherwise invalid subscription with a later endDate can be selected instead of the subscription that is valid today.

**Recommended fix:** Query for a subscription satisfying status ACTIVE, startDate <= now and endDate >= now. Define a database/business rule for overlapping active subscriptions.

## AUD-006. Optional card-version validation — P1 / High

**File:** src/app/api/checkin/route.ts

**Problem:** The card version is checked only when supplied. A request containing only memberCode can skip the card-version check.

**Why it matters:** If cardVersion is intended to invalidate old physical cards after reissue, the security control is bypassable through the API.

**Recommended fix:** Require a card credential/version for card-based check-in, or explicitly separate member-code/manual check-in from card check-in and enforce elevated permissions for manual override.

## AUD-007. Dashboard over-fetching — P2 / Medium

**File:** src/app/dashboard/page.tsx

**Problem:** findMany() loads every active session and the code uses activeSessions.length for the KPI.

**Why it matters:** The application transfers and hydrates records that are not needed for the count, which becomes expensive as membership grows.

**Recommended fix:** Use count() for the KPI and a separately limited/paginated query for the table. Add pagination or a reasonable display limit.

## AUD-008. Expiring subscription KPI includes expired records — P2 / Medium

**File:** src/app/dashboard/page.tsx

**Problem:** The KPI applies status ACTIVE and endDate <= fiveDaysAhead but does not explicitly require endDate >= now.

**Why it matters:** Depending on data consistency, subscriptions that have already expired may be counted as expiring.

**Recommended fix:** Use endDate >= now AND endDate <= fiveDaysAhead, and ensure subscription status is synchronized with dates.

## AUD-009. Sequential dashboard queries — P2 / Medium

**File:** src/app/dashboard/page.tsx

**Problem:** Four independent Prisma operations execute sequentially.

**Why it matters:** Dashboard response time increases unnecessarily because independent database work waits on the previous query.

**Recommended fix:** Use Promise.all() for independent queries, while keeping transactional operations grouped where consistency is required.

## AUD-010. Demo credentials in seed/login UI — P2 / Medium

**File:** prisma/seed.ts + src/app/login/page.tsx

**Problem:** The seed script creates admin123, mgr123 and rec123 passwords, and the login page exposes quick-fill demo credentials.

**Why it matters:** This is acceptable for a controlled demo environment but dangerous if seeded data or demo UI reaches production.

**Recommended fix:** Separate demo seeding from production deployment. Use environment-gated demo accounts, never ship default passwords to production, force password changes, and remove quick-fill from production builds.

## AUD-011. Audit log hardening — P2 / Medium

**File:** prisma/schema.prisma + src/app/api/checkin/route.ts

**Problem:** Audit details are stored in a String field containing serialized JSON. There is no explicit immutable/audit-admin boundary in the reviewed schema.

**Why it matters:** Audit records are compliance evidence. Poor structure makes querying harder and increases the risk of inconsistent or tampered history.

**Recommended fix:** Use PostgreSQL JSON/JSONB for structured details, centralize audit creation, restrict modification/deletion, record request metadata where appropriate, and add audit coverage for login, logout, member changes, subscription payments, POS, inventory, locker rental and overrides.

## AUD-012. POS/inventory atomicity requirement — P2 / Medium

**File:** prisma/schema.prisma

**Problem:** Product.currentStock is a mutable aggregate and StockMovement is a history table. The schema alone does not guarantee that sales decrement stock atomically or prevent negative stock under concurrent sales.

**Why it matters:** Concurrent POS sales can oversell inventory or leave currentStock inconsistent with movements.

**Recommended fix:** Perform sale creation, stock validation/decrement, order-item creation and stock movement creation in one DB transaction. Prefer an atomic conditional decrement and reject insufficient stock. Treat StockMovement as an immutable ledger.

# 4. Database Design Assessment

The Prisma schema is a solid foundation: monetary fields use Decimal, primary entities are separated, relationships are explicit, and useful indexes exist. The main weakness is that several business invariants are represented only in application code or ordinary indexes.

- Add partial uniqueness for one ACTIVE check-in session per member.
- Add partial uniqueness for one ACTIVE check-in session per locker.
- Define how active LockerRental and CheckinSession interact for reserved lockers.
- Define whether overlapping ACTIVE subscriptions are permitted; if not, enforce or validate it.
- Use structured JSON/JSONB for audit details.
- Consider createdAt/updatedAt and actor fields consistently across operational records.

# 5. Authentication & Authorization Assessment

Password hashing uses bcryptjs, which is preferable to storing plaintext passwords. However, the session layer is the most serious security weakness observed. Logout currently clears the cookie but does not revoke a server-side session because no server-side session record exists.

- Implement opaque server-side sessions or a vetted authentication framework.
- Set Secure on the production session cookie.
- Implement login rate limiting / brute-force protection.
- Use generic authentication failure messages to reduce account enumeration.
- Implement role checks in every protected API/action.
- Consider session rotation after login and privileged role changes.

# 6. Business & Financial Integrity Assessment

- Use Decimal for ETB amounts; the schema already does this correctly.
- Never trust client-submitted totalAmountETB; calculate totals server-side from authoritative product prices.
- Validate paymentRef according to payment method where required.
- Do not allow arbitrary refund/void operations without authorization and audit trail.
- Inventory decrement, order creation and stock movement should be one transaction.
- Payment and subscription activation should be atomic and auditable.

# 7. Production Readiness Checklist

| Area | Current assessment | Required before go-live |
|---|---|---|
| Authentication | Needs remediation | Replace forgeable cookie; add secure session lifecycle. |
| Authorization | Needs remediation | Server-side role checks for all APIs/actions. |
| Database integrity | Needs remediation | Partial unique constraints + transaction/locking strategy. |
| Check-in / lockers | Needs remediation | Concurrency-safe atomic operations + conflict handling. |
| Subscriptions | Needs remediation | Explicit current-valid subscription query/rules. |
| POS / inventory | Needs verification | Atomic stock operations and financial authorization. |
| Audit | Partially implemented | Centralized immutable audit strategy and broader coverage. |
| Performance | Partially ready | Pagination/count queries and parallel independent reads. |
| Testing | Insufficient evidence | Unit, integration, concurrency and E2E tests. |
| Deployment | Insufficient evidence | CI build/lint, secrets management, migrations, backups, monitoring and rollback. |

# 8. Recommended Remediation Plan

1. **Phase 1 — Security blocker removal:** Fix session architecture, secure cookie settings, server-side RBAC, login throttling and production/demo separation.

2. **Phase 2 — Data integrity:** Add DB invariants for active sessions/lockers; implement atomic locker assignment and check-in conflict handling.

3. **Phase 3 — Business correctness:** Correct subscription selection; harden card-version/manual check-in rules; define payment/refund/void authorization.

4. **Phase 4 — POS & inventory:** Make order, stock decrement and stock movement atomic; calculate totals on the server; add negative-stock protection.

5. **Phase 5 — Audit & observability:** Centralize audit events, add actor/request metadata, logging, health checks and operational monitoring.

6. **Phase 6 — Testing:** Add authentication/RBAC tests, check-in concurrency tests, locker race tests, subscription edge cases, POS/inventory tests and E2E front-desk flows.

7. **Phase 7 — Performance & deployment:** Paginate operational tables, optimize dashboard queries, add CI, production migrations, backups, restore tests and rollback procedures.

# 9. Recommended Test Matrix

- Two simultaneous check-ins for the same member → exactly one ACTIVE session.
- Two simultaneous check-ins selecting the same locker → exactly one assignment.
- Old cardVersion after card reissue → rejected.
- Manual member-code check-in → allowed only to explicitly authorized roles.
- Cancelled/future subscription with later endDate → never selected as current valid membership.
- POS sale with insufficient stock → rejected without partial order/movement.
- Two simultaneous sales of the final unit → exactly one succeeds.
- Finance Owner attempting reception-only check-in operation → HTTP 403.
- Inactive user session → rejected immediately.
- Logout → session cannot be reused.
- Expired session → rejected.
- Production environment → no demo quick-fill/default accounts.

# 10. Positive Findings

- Prisma/PostgreSQL is an appropriate foundation for transactional gym operations.
- Money fields are modeled with Decimal rather than floating-point numbers.
- bcrypt is used for password verification.
- Check-in, locker and audit operations are already being grouped into a transaction.
- Audit events exist for important actions such as staff login and session start.
- The domain model covers members, subscriptions, lockers, sessions, products, orders, stock movements and users.
- .gitignore excludes environment files and common build artifacts.

# 11. Final Audit Conclusion

Overall status: NOT PRODUCTION READY YET. The implementation has a useful functional foundation, but the authentication/session vulnerability is a critical blocker. Database-level concurrency protection is also required because this application operates physical resources (lockers), attendance state, payments and inventory. Once P0/P1 issues are remediated and verified with automated tests, the project can move toward a controlled pilot.

Recommended release gate: do not expose the current authentication/session implementation to untrusted users; do not treat application-level duplicate checks as sufficient protection for check-in, locker or inventory invariants.

# Appendix A — Evidence Notes

The following repository evidence informed the findings:

- session.ts creates a Base64 userId:expiration token and getSession() decodes it without signature verification.
- auth/login sets an HttpOnly cookie but does not set Secure and relies on the custom unsigned token.
- checkin/route.ts performs active-session and locker availability reads before the transactional write.
- schema.prisma contains ordinary indexes for memberId/sessionStatus and lockerId/sessionStatus, but no visible partial unique indexes.
- dashboard/page.tsx uses findMany() and activeSessions.length for the active-session KPI.
- seed.ts contains fixed demo credentials and creates demo users.
