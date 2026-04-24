# Doooda System Flow Diagrams

Visual representations of all critical system flows.

---

## 1. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIGNUP FLOW                               │
└─────────────────────────────────────────────────────────────────┘

User fills form                  Backend validates              Database
(email, password, etc)          (strength, uniqueness)          (PostgreSQL)
     │                                  │                              │
     │──── POST /auth/signup ──────────▶│                              │
     │                                  │                              │
     │                                  │──── Check email unique ─────▶│
     │                                  │◀──── Result ─────────────────│
     │                                  │                              │
     │                                  │──── Hash password (bcrypt) ──│
     │                                  │                              │
     │                                  │──── CREATE user ────────────▶│
     │                                  │     (emailVerified=false)    │
     │                                  │◀──── User created ───────────│
     │                                  │                              │
     │                                  │──── Generate token ──────────│
     │                                  │──── Hash token ──────────────│
     │                                  │──── CREATE verification ────▶│
     │                                  │     token (expires 24h)      │
     │                                  │                              │
     │                                  │──── CREATE audit_log ───────▶│
     │                                  │     (action: signup)         │
     │                                  │                              │
     │◀──── Response: success ──────────│                              │
     │      "Check email to verify"    │                              │
     │                                  │                              │
     │                              [Send email with token]            │
     │                                  │                              │

┌─────────────────────────────────────────────────────────────────┐
│                   EMAIL VERIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User clicks link              Backend verifies                Database
in email                     token & marks verified
     │                              │                              │
     │── POST /auth/verify-email ──▶│                              │
     │    (token)                   │                              │
     │                              │──── Hash token ──────────────│
     │                              │──── FIND token ─────────────▶│
     │                              │◀──── Token record ───────────│
     │                              │                              │
     │                              │──── Check expiry ────────────│
     │                              │──── Check not used ──────────│
     │                              │                              │
     │                              │──── UPDATE user ────────────▶│
     │                              │     (emailVerified=true)     │
     │                              │──── UPDATE token ───────────▶│
     │                              │     (verifiedAt=now)         │
     │                              │                              │
     │◀──── Response: verified ─────│                              │
     │                              │                              │

┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────────┘

User enters             Backend authenticates          Database
credentials            & generates tokens
     │                         │                              │
     │─── POST /auth/login ───▶│                              │
     │    (email, password)    │                              │
     │                         │                              │
     │                         │─── Rate limit check ─────────│
     │                         │                              │
     │                         │─── FIND user ───────────────▶│
     │                         │◀─── User record ─────────────│
     │                         │                              │
     │                         │─── Check emailVerified ──────│
     │                         │─── Compare password ─────────│
     │                         │    (bcrypt.compare)          │
     │                         │                              │
     │                         │─── Generate JWT ─────────────│
     │                         │    (15 min expiry)           │
     │                         │─── Generate refresh token ───│
     │                         │─── Hash refresh token ───────│
     │                         │                              │
     │                         │─── CREATE auth_session ─────▶│
     │                         │    (IP, user_agent, expiry)  │
     │                         │─── UPDATE user ─────────────▶│
     │                         │    (lastLoginAt=now)         │
     │                         │─── CREATE audit_log ────────▶│
     │                         │                              │
     │◀─── Response ───────────│                              │
     │    accessToken (JSON)   │                              │
     │    refreshToken (cookie)│                              │
     │                         │                              │

┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                            │
└─────────────────────────────────────────────────────────────────┘

Client access          Backend rotates tokens         Database
token expired
     │                         │                              │
     │─ POST /auth/refresh ───▶│                              │
     │  (refreshToken)         │                              │
     │                         │                              │
     │                         │─── Hash token ───────────────│
     │                         │─── FIND session ────────────▶│
     │                         │◀─── Session record ──────────│
     │                         │                              │
     │                         │─── Check not revoked ────────│
     │                         │─── Check not expired ────────│
     │                         │                              │
     │                         │─── Generate NEW JWT ─────────│
     │                         │─── Generate NEW refresh ─────│
     │                         │─── Hash NEW refresh ─────────│
     │                         │                              │
     │                         │─── UPDATE old session ──────▶│
     │                         │    (revokedAt=now) [OLD]     │
     │                         │─── CREATE new session ──────▶│
     │                         │    [NEW]                     │
     │                         │                              │
     │◀─ Response ─────────────│                              │
     │   NEW accessToken       │                              │
     │   NEW refreshToken      │                              │
     │                         │                              │
     │  [OLD token now invalid]│                              │
```

---

## 2. Subscription & Pricing Lock Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION CREATION (PRICE LOCK)                  │
└─────────────────────────────────────────────────────────────────┘

User selects plan          Backend locks price           Database
     │                         │                              │
     │─ POST /subscription/ ──▶│                              │
     │   initiate             │                              │
     │   (plan, interval)     │                              │
     │                         │                              │
     │                         │─── Check no active sub ─────▶│
     │                         │◀─── Confirmed ───────────────│
     │                         │                              │
     │                         │─── FIND current price ──────▶│
     │                         │    WHERE plan_name = X       │
     │                         │    AND billing_interval = Y  │
     │                         │    AND active_until IS NULL  │
     │                         │◀─── price_v1 ────────────────│
     │                         │     (id: abc123, $10)        │
     │                         │                              │
     │                         │─── CREATE subscription ─────▶│
     │                         │    priceVersionId = abc123   │
     │                         │    ▲▲▲ LOCKED HERE ▲▲▲       │
     │                         │    status = INCOMPLETE       │
     │                         │◀─── Created ─────────────────│
     │                         │                              │
     │                         │─── CREATE history ──────────▶│
     │                         │    (event: CREATED)          │
     │                         │                              │
     │◀─ Response ─────────────│                              │
     │   subscriptionId       │                              │
     │   price: $10 (LOCKED)  │                              │
     │                         │                              │
     │                    [Redirect to Stripe]                │
     │                         │                              │

┌─────────────────────────────────────────────────────────────────┐
│                 PRICE CHANGE (USER UNAFFECTED)                   │
└─────────────────────────────────────────────────────────────────┘

Admin changes          Backend creates new            Database
price                 price version
     │                         │                              │
     │─ Admin action: ────────▶│                              │
     │   Increase STANDARD     │                              │
     │   from $10 to $15       │                              │
     │                         │                              │
     │                         │─── UPDATE old price ────────▶│
     │                         │    SET active_until = now()  │
     │                         │    WHERE id = abc123         │
     │                         │                              │
     │                         │─── CREATE new price ────────▶│
     │                         │    plan_name = STANDARD      │
     │                         │    price_cents = 1500        │
     │                         │    active_from = now()       │
     │                         │    active_until = NULL       │
     │                         │◀─── price_v2 (def456) ───────│
     │                         │                              │
     │                    [Existing subscriptions UNCHANGED]  │
     │                         │                              │
     │                         │─── User Ahmed's sub: ────────│
     │                         │    priceVersionId = abc123   │
     │                         │    (still $10, LOCKED)       │
     │                         │                              │
     │                         │─── New subscribers: ─────────│
     │                         │    priceVersionId = def456   │
     │                         │    (pay $15, NEW LOCK)       │
     │                         │                              │

┌─────────────────────────────────────────────────────────────────┐
│                RENEWAL (KEEPS LOCKED PRICE)                      │
└─────────────────────────────────────────────────────────────────┘

Stripe webhook         Backend processes              Database
arrives               renewal
     │                         │                              │
     │─ customer.subscription.│                              │
     │  updated ──────────────▶│                              │
     │  (stripeSubId)         │                              │
     │                         │                              │
     │                         │─── Verify signature ─────────│
     │                         │                              │
     │                         │─── FIND subscription ───────▶│
     │                         │    WHERE stripeSubId = X     │
     │                         │◀─── Subscription ────────────│
     │                         │     priceVersionId = abc123  │
     │                         │                              │
     │                         │─── FIND price_version ──────▶│
     │                         │    WHERE id = abc123         │
     │                         │◀─── $10 price ───────────────│
     │                         │                              │
     │                         │─── Validate Stripe charged $10│
     │                         │                              │
     │                         │─── UPDATE subscription ─────▶│
     │                         │    currentPeriodEnd = +1mo   │
     │                         │                              │
     │                         │─── CREATE history ──────────▶│
     │                         │    (event: RENEWED)          │
     │                         │                              │
     │◀─ 200 OK ───────────────│                              │
     │                         │                              │
     │         [User still pays $10, not current $15]         │

┌─────────────────────────────────────────────────────────────────┐
│          CANCELLATION (PRICE LOCK LOST)                          │
└─────────────────────────────────────────────────────────────────┘

User cancels           Backend marks cancelled        Database
     │                         │                              │
     │─ DELETE /subscription/ ▶│                              │
     │   :id                  │                              │
     │                         │                              │
     │                         │─── FIND subscription ───────▶│
     │                         │◀─── User's subscription ─────│
     │                         │     priceVersionId = abc123  │
     │                         │                              │
     │                         │─── Verify ownership ─────────│
     │                         │                              │
     │                         │─── UPDATE subscription ─────▶│
     │                         │    status = CANCELLED        │
     │                         │    cancelledAt = now()       │
     │                         │                              │
     │                         │─── CREATE history ──────────▶│
     │                         │    (event: CANCELLED)        │
     │                         │                              │
     │                         │─── CREATE audit_log ────────▶│
     │                         │                              │
     │◀─ Response ─────────────│                              │
     │   "Cancelled"          │                              │
     │                         │                              │
     │         [Price lock GONE. Old price LOST]              │

┌─────────────────────────────────────────────────────────────────┐
│        RE-SUBSCRIPTION (NEW LOCK AT CURRENT PRICE)               │
└─────────────────────────────────────────────────────────────────┘

User subscribes        Backend creates new            Database
again                 subscription
     │                         │                              │
     │─ POST /subscription/ ──▶│                              │
     │   initiate             │                              │
     │                         │                              │
     │                         │─── Check no active sub ─────▶│
     │                         │◀─── Confirmed (old cancelled)│
     │                         │                              │
     │                         │─── FIND CURRENT price ──────▶│
     │                         │    WHERE active_until = NULL │
     │                         │◀─── price_v2 ────────────────│
     │                         │     (id: def456, $15)        │
     │                         │     [NOT old abc123!]        │
     │                         │                              │
     │                         │─── CREATE subscription ─────▶│
     │                         │    priceVersionId = def456   │
     │                         │    ▲▲▲ NEW LOCK AT $15 ▲▲▲   │
     │                         │◀─── Created ─────────────────│
     │                         │                              │
     │◀─ Response ─────────────│                              │
     │   price: $15 (NEW LOCK)│                              │
     │                         │                              │
     │      [Old $10 lock permanently lost]                   │
```

---

## 3. Plan Enforcement Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              SERVER-SIDE PLAN ENFORCEMENT                        │
└─────────────────────────────────────────────────────────────────┘

User attempts          Backend checks plan            Database
action                access
     │                         │                              │
     │─ POST /projects ───────▶│                              │
     │   (create new project)  │                              │
     │   + JWT token          │                              │
     │                         │                              │
     │                         │─── Extract userId from JWT ──│
     │                         │                              │
     │                         │─── FIND active sub ─────────▶│
     │                         │    WHERE userId = X          │
     │                         │    AND status = ACTIVE       │
     │                         │◀─── Subscription ────────────│
     │                         │     priceVersionId = Y       │
     │                         │                              │
     │                         │─── FIND price_version ──────▶│
     │                         │    WHERE id = Y              │
     │                         │◀─── Plan features ───────────│
     │                         │     { maxProjects: 10 }      │
     │                         │                              │
     │                         │─── COUNT user's projects ───▶│
     │                         │    WHERE userId = X          │
     │                         │◀─── Count: 9 ────────────────│
     │                         │                              │
     │                         │─── Check: 9 < 10 ────────────│
     │                         │    ✅ ALLOWED                 │
     │                         │                              │
     │                         │─── CREATE project ──────────▶│
     │                         │                              │
     │◀─ 201 Created ──────────│                              │
     │                         │                              │

     ─────────────────────────────────────────────────────────────

User attempts          Backend checks plan            Database
another action        access (BLOCKED)
     │                         │                              │
     │─ POST /projects ───────▶│                              │
     │   (create 11th project) │                              │
     │                         │                              │
     │                         │─── Extract userId ───────────│
     │                         │─── FIND active sub ─────────▶│
     │                         │◀─── FREE plan ───────────────│
     │                         │     { maxProjects: 1 }       │
     │                         │                              │
     │                         │─── COUNT projects ──────────▶│
     │                         │◀─── Count: 1 ────────────────│
     │                         │                              │
     │                         │─── Check: 1 < 1 ─────────────│
     │                         │    ❌ DENIED                  │
     │                         │                              │
     │◀─ 403 Forbidden ────────│                              │
     │   "Project limit        │                              │
     │    reached. Upgrade."   │                              │
     │                         │                              │

     ─────────────────────────────────────────────────────────────

User attempts          Backend checks feature         Database
AI feature            access
     │                         │                              │
     │─ POST /ai/ask-doooda ──▶│                              │
     │   (AI query)           │                              │
     │                         │                              │
     │                         │─── Extract userId ───────────│
     │                         │─── FIND active sub ─────────▶│
     │                         │◀─── STANDARD plan ───────────│
     │                         │     { askDoooda: false }     │
     │                         │                              │
     │                         │─── Check feature ────────────│
     │                         │    ❌ NOT AVAILABLE           │
     │                         │                              │
     │◀─ 403 Forbidden ────────│                              │
     │   "Ask Doooda requires  │                              │
     │    PRO plan"           │                              │
     │                         │                              │

┌─────────────────────────────────────────────────────────────────┐
│                    PLAN ENFORCEMENT SUMMARY                      │
└─────────────────────────────────────────────────────────────────┘

Every Protected Action:
  1. Extract userId from JWT (never trust client)
  2. Query active subscription
  3. Resolve price_version to get features
  4. Check action against plan limits
  5. Allow or deny based on server-side rules

Client CANNOT bypass:
  - All checks server-side only
  - No client state trusted
  - No client-provided plan info accepted
  - Database is source of truth
```

---

## 4. State Machine Diagrams

```
┌─────────────────────────────────────────────────────────────────┐
│               USER ACCOUNT STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │   SIGNED UP  │  emailVerified = false
     │  (Unverified)│  Cannot login
     └──────┬───────┘
            │
            │ User clicks verification link
            │
            ▼
     ┌──────────────┐
     │   VERIFIED   │  emailVerified = true
     │   (Active)   │  Can login
     └──────┬───────┘
            │
            ├───────────────────┐
            │                   │
   Password reset        Account deletion
            │                   │
            ▼                   ▼
     ┌──────────────┐    ┌──────────────┐
     │   VERIFIED   │    │    DELETED   │
     │ (All sessions│    │ (Soft delete)│
     │  invalidated)│    └──────────────┘
     └──────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │ NO_SUBSCRIPTION│
     │   (FREE plan)  │
     └──────┬─────────┘
            │
            │ User initiates subscription
            │
            ▼
     ┌──────────────┐
     │  INCOMPLETE  │  Payment pending
     │ (Waiting pay)│  No feature access yet
     └──────┬───────┘
            │
            │ Payment succeeds (Stripe webhook)
            │
            ▼
     ┌──────────────┐
     │    ACTIVE    │  Full feature access
     │ (Subscribed) │  Price LOCKED
     └──────┬───────┘
            │
            ├─────────────┬──────────────┐
            │             │              │
     Payment fails   User cancels   Period ends
            │             │          (if marked)
            ▼             ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  PAST_DUE    │ │  CANCELLED   │ │  CANCELLED   │
     │  (Retrying)  │ │ (Immediate)  │ │  (Deferred)  │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
     Payment succeeds        │                │
            │                │                │
            │         Price lock LOST         │
            │                │                │
            ▼                ▼                ▼
     ┌──────────────┐ ┌──────────────────────────┐
     │    ACTIVE    │ │   NO_SUBSCRIPTION        │
     │ (Restored)   │ │   (Back to FREE)         │
     └──────────────┘ │   (Must resubscribe at   │
                      │    current price)        │
                      └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              REFRESH TOKEN STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │   CREATED    │  On login
     │  (Active)    │  revokedAt = NULL
     └──────┬───────┘
            │
            ├─────────────┬────────────┬─────────────┐
            │             │            │             │
     Used for refresh  Expired   Logout      Password change
            │             │            │             │
            ▼             ▼            ▼             ▼
     ┌──────────────┐ ┌──────────────────────────────┐
     │   REVOKED    │ │        REVOKED               │
     │ (New created)│ │    (Cannot reuse)            │
     └──────────────┘ └──────────────────────────────┘
            │
            │ Old token unusable
            │ New token created
            │
            ▼
     ┌──────────────┐
     │   CREATED    │  New active token
     │  (Active)    │
     └──────────────┘
```

---

## 5. Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                 DEFENSE-IN-DEPTH LAYERS                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: NETWORK                                                 │
│   ├─ HTTPS/TLS 1.3 enforced                                     │
│   ├─ HSTS headers                                               │
│   └─ No HTTP fallback                                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: APPLICATION                                             │
│   ├─ Rate limiting (IP + user-based)                            │
│   ├─ Input validation (class-validator)                         │
│   ├─ Output sanitization                                        │
│   ├─ CORS whitelist                                             │
│   └─ CSRF tokens                                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: AUTHENTICATION                                          │
│   ├─ bcrypt password hashing (12 rounds)                        │
│   ├─ Email verification required                                │
│   ├─ JWT short-lived (15 min)                                   │
│   ├─ Refresh token rotation                                     │
│   └─ Session tracking                                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: AUTHORIZATION                                           │
│   ├─ RBAC guards (writer/admin)                                 │
│   ├─ user_id from JWT only                                      │
│   ├─ No client-provided context                                 │
│   ├─ Project ownership validation                               │
│   └─ Plan enforcement checks                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: DATA                                                    │
│   ├─ Row-level filtering (multi-tenant)                         │
│   ├─ Encrypted sensitive fields                                 │
│   ├─ Soft deletes (paranoid mode)                               │
│   ├─ Audit trail (append-only)                                  │
│   └─ UUIDs (no enumeration)                                     │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                   ATTACK PREVENTION MATRIX                       │
└─────────────────────────────────────────────────────────────────┘

Attack Type                Mitigation
───────────────────────────────────────────────────────────────────
SQL Injection          →   Prisma ORM (parameterized queries only)
XSS                    →   Output sanitization, CSP headers
CSRF                   →   CSRF tokens, SameSite cookies
Brute Force (Login)    →   Rate limiting (5/15min), account lockout
Brute Force (Password) →   bcrypt slow hashing (12 rounds)
Token Theft            →   httpOnly cookies, token rotation
Session Hijacking      →   IP/user agent tracking, short expiry
Email Enumeration      →   Generic error messages
ID Enumeration         →   UUIDs everywhere
Privilege Escalation   →   Server-side role checks, immutable roles
Subscription Abuse     →   Price lock in database, webhook verification
Replay Attacks         →   Refresh token rotation, single-use tokens
Data Leakage           →   No sensitive data in logs/errors
MitM Attacks           →   TLS 1.3, certificate pinning (future)
DoS                    →   Rate limiting, request timeouts
```

---

**Documentation Version:** 1.0.0
**Last Updated:** 2026-01-07
**Status:** Complete
