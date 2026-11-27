# LATROCORE Enterprise Authentication & Identity System

A production-grade, secure full-stack authentication application implementing the **Silent Refresh** pattern with **Argon2id** password hashing, short-lived signed JWTs (`sub`, `sid`, `iss`, `aud`, `iat`, `exp`, unique `jti`), cryptographically secure rotating refresh tokens in `__Secure-` cookies, multi-worker rate limiting, and comprehensive CSRF/Origin defenses.

---

## 1. Architecture Overview

### Token Strategy & Silent Refresh Pattern
- **Short-Lived Access Token (15 Minutes)**:
  - Formatted as a signed JWT (`HS256`).
  - Claims: `sub` (User ID), `sid` (Session ID), `iss` (`latrocore-auth`), `aud` (`latrocore-client`), `iat`, `exp`, and unique `jti`.
  - Stored **strictly in memory** on the client (`inMemoryAccessToken`).
  - Never persisted to `localStorage`, `sessionStorage`, cookies, or browser URLs.
- **Long-Lived Refresh Token (7 Days)**:
  - Generated as a 32-byte cryptographically secure random string (`secrets.token_urlsafe(32)`).
  - Stored in PostgreSQL **only as a SHA-256 hex digest** with a unique index. The raw token is never saved in the database or server logs.
  - Delivered exclusively via `Set-Cookie` using cookie name `__Secure-refresh`.
- **Cookie Security Specifications**:
  - `HttpOnly = True` (inaccessible to client-side scripts, neutralizing XSS exfiltration).
  - `Secure = True` (transmitted exclusively over TLS/HTTPS).
  - `SameSite = Strict` (preventing cross-site request inclusion).
  - `Path = /auth` (scoped strictly to the auth routes; match `/api/v1/auth` if proxying behind an API prefix).
  - `Max-Age = 604800` (7 days) and no `Domain` attribute (host-only cookie).
- **Atomic Rotation & Reuse Detection**:
  - Every successful call to `POST /auth/refresh` marks the previous token hash as consumed (`is_consumed = True`, `consumed_at = utcnow()`) and generates a new refresh token.
  - Database row locking (`SELECT ... FOR UPDATE`) prevents concurrent refresh races.
  - If a consumed token hash is ever presented again, the server detects a **Replay / Token Theft Attack**, immediately revokes the entire session and token family (`is_revoked = True`), deletes the cookie, and rejects the request.
  - Session lifetime is capped at a fixed 7 days from initial login; rotation does not extend it indefinitely.

---

## 2. Security Controls Matrix

| Security Layer | Implemented Control | Threat Mitigated |
|---|---|---|
| **Password Storage** | Argon2id (`m=65536, t=3, p=4`) | GPU / ASIC brute-force, rainbow tables |
| **Credential Storage** | Access Token in memory only; non-sensitive `hasSession=true` in localStorage | Persistent token theft via XSS |
| **Token Transmission** | `__Secure-refresh` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth`, host-only) | Token sniffing, script access, cross-site inclusion |
| **CSRF Defense** | Strict Origin matching + mandatory custom header `X-Requested-With: XMLHttpRequest` | Cross-site request forgery |
| **Replay Defense** | Token family rotation, consumed hash retention, immediate family revocation | Stolen refresh token replay |
| **Rate Limiting** | Database-backed multi-worker limiter (max 5/account, 10/IP per 15 min) | Credential stuffing, brute-force attacks |
| **Cache Control** | `Cache-Control: no-store, no-cache, must-revalidate` on all `/auth/*` responses | Sensitive credential caching on shared proxies |
| **Cross-Tab Sync** | Web Locks API (`navigator.locks`) coordinates token refresh across tabs | Inter-tab cookie race collisions |

---

## 3. Directory Structure

```
latrocore/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py           # /auth/login, /auth/refresh, /auth/logout, /auth/me
│   │   │   ├── dashboard.py      # Protected /dashboard endpoint
│   │   │   └── router.py         # Combined API routers
│   │   ├── core/
│   │   │   ├── config.py         # Settings & startup security validator
│   │   │   ├── csrf.py           # Origin & custom header CSRF guard
│   │   │   ├── database.py       # SQLAlchemy engine & session dependency
│   │   │   ├── dependencies.py   # JWT validation & active session verifier
│   │   │   ├── rate_limiter.py   # Database-backed distributed rate limiter
│   │   │   └── security.py       # Argon2id, SHA-256 & JWT utilities
│   │   └── models/
│   │       └── models.py         # Users, Sessions, RefreshTokens, RateLimits
│   ├── alembic/                  # Database migration scripts
│   │   └── versions/
│   │       └── 001_initial_auth_tables.py
│   ├── tests/
│   │   └── test_auth.py          # 10 comprehensive security tests
│   ├── cli.py                    # Secure user-provisioning CLI (privately entered password)
│   ├── generate_certs.py         # Localhost TLS/SSL cert generator for HTTPS
│   ├── main.py                   # FastAPI application entry point
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   └── .env                      # Active environment configuration
│
└── frontend/
    ├── src/
    │   ├── auth/
    │   │   ├── AuthContext.jsx   # In-memory auth state, deduplicated bootstrap, login/logout
    │   │   └── ProtectedRoute.jsx# Loading state guard without flash of unauthenticated UI
    │   ├── lib/
    │   │   └── axios.js          # Axios interceptor with 401 concurrency queue & Web Locks
    │   ├── pages/
    │   │   ├── Login.jsx         # Forest-green / light ivory SaaS login with validation
    │   │   └── Dashboard.jsx     # Protected metrics dashboard with retryable logout
    │   └── tests/
    │       └── axiosInterceptor.test.js # 6 automated Vitest tests for queue & races
    ├── vite.config.js            # Vite configuration with backend proxy
    └── package.json              # Frontend scripts & dependencies
```

---

## 4. Setup & Installation

### Backend Setup

1. **Navigate to the backend directory and activate the virtual environment**:
   ```bash
   cd backend
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Ensure `JWT_SECRET` is at least 32 characters long. Set `DATABASE_URL` to your PostgreSQL database (or `sqlite:///./latrocore_auth.db` for local SQLite development):
   ```ini
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/latrocore
   JWT_SECRET=super_secret_signing_key_at_least_32_characters_long_for_security_production
   ```

4. **Run Database Migrations (Alembic)**:
   ```bash
   alembic upgrade head
   ```

5. **Provision the First User Securely**:
   Run the CLI command which prompts for email, name, role, and a privately entered password (no terminal echo or history exposure):
   ```bash
   python cli.py create-user
   ```

---

### Local HTTPS & Same-Site Deployment Setup

Refresh cookies use `Secure=True`, `SameSite=Strict`, and `Path=/auth`. To preserve these attributes locally and in production:

1. **Generate local TLS certificates** (included SANs for `localhost` and `127.0.0.1`):
   ```bash
   cd backend
   python generate_certs.py
   ```
   This generates `backend/cert.pem` and `backend/key.pem`.

2. **Run FastAPI with HTTPS**:
   ```bash
   .\.venv\Scripts\python.exe -m uvicorn main:app --ssl-keyfile key.pem --ssl-certfile cert.pem --port 8000 --reload
   ```
   Or for standard HTTP behind a same-origin proxy:
   ```bash
   .\.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload
   ```

3. **Start the Vite Frontend (same-origin proxy to `/auth` and `/api`)**:
   - **Recommended Local HTTPS**:
     ```bash
     cd ../frontend
     npm install
     npm run dev:https
     ```
     Serves at `https://localhost:5173` and proxies `/auth`, `/dashboard`, `/admin`, `/api`, and `/uploads` to `https://127.0.0.1:8000`.
   - **Standard HTTP Localhost Proxy**:
     ```bash
     npm run dev
     ```
     Serves at `http://localhost:5173` (always open `http://localhost:5173` or `https://localhost:5173` rather than mixing `localhost` and `127.0.0.1`, because `SameSite=Strict` cookies set on `localhost` will not be sent across hostnames).

4. **Production Same-Origin Reverse Proxy (`SameSite=Strict` + `Path=/auth`)**:
   If your frontend and backend would otherwise sit on separate domains, place both behind one reverse proxy origin (e.g., Nginx or Caddy):
   ```caddy
   app.example.com {
     handle /auth* {
       reverse_proxy 127.0.0.1:8000
     }
     handle /api* {
       reverse_proxy 127.0.0.1:8000
     }
     handle /dashboard* {
       reverse_proxy 127.0.0.1:8000
     }
     handle {
       reverse_proxy 127.0.0.1:5173
     }
   }
   ```
   In `.env`, set `ALLOWED_ORIGINS=https://app.example.com` and match `COOKIE_PATH=/auth` (or `/api/v1/auth` if routing auth under an `/api/v1` prefix).

5. **Production Build**:
   ```bash
   cd frontend
   npm run build
   ```

---

## 5. Running Automated Tests

### Backend Test Suite (Pytest)
Validates password verification, cookie attributes, SHA-256 digest-only storage, unique index, `jti` claims, silent refresh rotation, reuse detection, logout invalidation of both JWT and refresh cookie, CSRF/Origin validation, 401 vs 403 checks, and rate limiting:
```bash
cd backend
.\.venv\Scripts\pytest tests/test_auth.py -v
```

### Frontend Test Suite (Vitest)
Validates memory-only storage, 5-concurrent-401 single-refresh queue, replay loop prevention, late-401 same-session vs cross-session guards, refresh 401 vs network failure recovery, StrictMode reload with `hasSession`, and logout-in-flight races:
```bash
cd frontend
npm test
```

---

## 6. Endpoints Documentation

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `PATCH` | `/auth/me` | Authenticated session | Updates the authenticated user's name and mobile number. |
| `POST` | `/auth/change-password` | Authenticated session | Verifies the current password, updates its Argon2id hash, and revokes active sessions. |
| `POST` | `/auth/login` | Rate Limiter + CSRF/Origin | Verifies Argon2id password, creates session, sets `__Secure-refresh` cookie (`Path=/auth`), returns Access Token. |
| `POST` | `/auth/refresh` | CSRF/Origin + Cookie | Verifies cookie SHA-256 digest, rotates token atomically, checks reuse, returns new Access Token. |
| `POST` | `/auth/logout` | CSRF/Origin + Cookie | Revokes DB session even if Access JWT expired, clears cookie with matching attrs, returns `204`. |
| `GET` | `/auth/me` | Bearer JWT + Session Check | Returns authenticated user profile after checking JWT claims and active DB session. |
| `GET` | `/dashboard` | Bearer JWT + Session Check | Protected demonstration endpoint returning telemetry and session status. |
