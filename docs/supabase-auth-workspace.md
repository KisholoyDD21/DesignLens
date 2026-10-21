# Supabase Authentication & Persistent Workspace Architecture

DesignLens features a production-oriented authentication system and persistent design workspace powered by **Supabase Auth** and **PostgreSQL Row Level Security (RLS)** via `@supabase/ssr`.

---

## 1. Architecture Overview

- **Server-Side Session Handling:** Session tokens are stored in secure HTTP-only cookies and refreshed via Next.js middleware using `@supabase/ssr`.
- **Identity Verification:** All protected operations on the server authenticate via `supabase.auth.getUser()`, ensuring cryptographic server-side JWT verification against Supabase rather than trusting client-supplied claims.
- **Data Isolation:** User tables (`public.profiles`, `public.reports`) have PostgreSQL Row Level Security (RLS) enabled with strict `auth.uid() = user_id` policies for all operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- **Cascade Deletion:** User deletion cascades automatically to profiles and reports via foreign keys with `ON DELETE CASCADE` and a dedicated `SECURITY DEFINER` RPC `delete_user_account()`.
- **Guest Analysis Preservation:** Unauthenticated users can continue to inspect public websites and download Markdown and ZIP bundles without creating an account.

---

## 2. Environment Variables

Add the following to your `.env.local` or production deployment dashboard:

```bash
# Canonical public site URL (HTTPS in production)
SITE_URL=https://designlens-p9yd.onrender.com

# Supabase Project Connection (From Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Server-only optional administrative operations (never expose to client)
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## 3. Database Migration Setup

Migrations are located in `supabase/migrations/20261022000000_init_auth_and_workspace.sql`.

### Option A: Using the Supabase Dashboard SQL Editor
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** -> **New query**.
3. Copy the full contents of `supabase/migrations/20261022000000_init_auth_and_workspace.sql`.
4. Run the query. It will create `public.profiles`, `public.reports`, RLS policies, indices, and the automated profile trigger.

### Option B: Using the Supabase CLI
```bash
npx supabase db push
# or
npx supabase migration up
```

---

## 4. Supabase Auth Configuration

### Allowed Redirect URLs & Site URL
In **Authentication** -> **URL Configuration**:
- **Site URL:**
  - Production: `https://your-domain.com` (or `https://designlens-p9yd.onrender.com`)
  - Local: `http://localhost:3000`
- **Redirect URLs (Whitelist):**
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
  - `https://your-domain.com/auth/callback`
  - `https://*.vercel.app/auth/callback` (for preview deployments)

### Email Authentication
- In **Authentication** -> **Providers** -> **Email**:
  - Enable **Email provider**.
  - **Confirm email**: Enable if you want users to verify their email before initial login (a dedicated "Check your inbox" screen with resend capabilities is built in). Disable if you want instant login on registration.

---

## 5. OAuth Provider Setup

### A. Google OAuth
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create an **OAuth 2.0 Client ID** under **APIs & Services** -> **Credentials**.
3. Application Type: **Web application**.
4. Authorized Redirect URIs:
   - Copy the Callback URL from your Supabase Dashboard (**Authentication** -> **Providers** -> **Google**):
   - Example: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret** into the Supabase Google Provider configuration and save.

### B. GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**.
2. **Application name:** `DesignLens`
3. **Homepage URL:** `https://your-domain.com` (or `http://localhost:3000`)
4. **Authorization callback URL:**
   - Copy from Supabase Dashboard (**Authentication** -> **Providers** -> **GitHub**):
   - Example: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Generate a **Client secret**, copy both Client ID and Client Secret into Supabase GitHub Provider settings, and enable the provider.

---

## 6. Route Structure

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public / Guest | Email/password login, Google/GitHub OAuth, forgot-password link |
| `/signup` | Public / Guest | Registration with password strength meter, email verification |
| `/forgot-password` | Public | Enumeration-resistant recovery request |
| `/reset-password` | Authorized token | Recovery password change form |
| `/auth/callback` | Public | PKCE code exchange and open-redirect protected dispatcher |
| `/dashboard` | Protected (User) | Personal workspace: saved systems, search, favorites, exports |
| `/settings` | Protected (User) | Display name, theme preference, verified email status |
| `/settings/security` | Protected (User) | Password change, OAuth account info, account deletion |
| `/api/reports` | Protected (User) | `GET` (list reports) and `POST` (save report to workspace) |
| `/api/reports/[id]` | Protected (Owner) | `GET`, `PATCH` (metadata/favorites), `DELETE` (delete report) |
| `/api/account` | Protected (User) | `GET` and `PATCH` user profile settings |
| `/api/account/delete` | Protected (User) | Cascading account deletion |

---

## 7. Security Safeguards

1. **Open-Redirect Protection:** Callback redirect parameters (`next`) are strictly validated against `getSafeRedirectUrl()`, blocking protocol-relative (`//evil.com`), backslash (`/\`), and cross-origin redirects.
2. **Account Enumeration Prevention:** Forgot-password and login error messages are generic (`sanitizeAuthError()`), preventing attackers from determining whether an email address exists in the system.
3. **Strict RLS Enforcement:** Even if a malicious user alters an ID parameter, PostgreSQL Row Level Security enforces that queries only return or modify rows where `auth.uid() = user_id`.
4. **No Client Secret Exposure:** The service-role key is never included in client bundles. All client interactions use the public anon key with cookie-managed sessions.
5. **SSRF & Anti-Abuse Protection:** Public analysis routes maintain `assertPublicHttpUrl()`, domain DNS resolution checks, and client IP rate limiting.

---

## 8. Testing & Verification

Run the automated test suite:
```bash
npm test
```

Run static type checking:
```bash
npm run typecheck
```

Run linter:
```bash
npm run lint
```

Run source architecture verification:
```bash
npm run verify:source
```

Run secret scanning check:
```bash
npm run verify:secrets
```

Run production build:
```bash
npm run build
```
