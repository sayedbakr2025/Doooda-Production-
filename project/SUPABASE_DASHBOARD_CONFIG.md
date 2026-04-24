# Supabase Dashboard Configuration Required

The following security enhancements require configuration in your Supabase Dashboard (cannot be set via SQL migrations):

## 1. Auth DB Connection Strategy - Switch to Percentage

**Current Issue:** Auth server is configured to use at most 10 connections (fixed number)

**How to Fix:**
1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Connection Pooling**
3. Find **Auth Server Pool Size**
4. Change from **Fixed (10)** to **Percentage-based allocation**
5. Recommended: Set to **10-15%** of total connections
6. Click **Save**

**Why:** Percentage-based allocation automatically scales with your database instance size.

---

## 2. Enable Leaked Password Protection

**Current Issue:** Password breach detection is disabled

**How to Fix:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. Find **Password Breach Detection**
4. Toggle **Enable HaveIBeenPwned integration** to ON
5. Click **Save**

**Why:** This prevents users from using passwords that have been exposed in data breaches, significantly improving account security.

---

## Status Summary

✅ **Fixed via Migrations:**
- RLS performance optimization (auth function calls)

✅ **No Action Needed:**
- Unused indexes (intentional for future scaling)
- Multiple permissive policies (correct security design)

⚠️ **Requires Dashboard Config:**
- Auth connection strategy (see above)
- Password breach detection (see above)
