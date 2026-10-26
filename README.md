# LATROCORE Enterprise Authentication & Identity System

A production-grade, secure full-stack authentication application implementing the **Silent Refresh** pattern with **Argon2id** password hashing, short-lived signed JWTs, cryptographically secure rotating refresh tokens in `__Host-` cookies, multi-worker rate limiting, and comprehensive CSRF defenses.

---

## 1. Architecture Overview

### Token Strategy & Silent Refresh Pattern
- **Short-Lived Access Token (15 Minutes)**:
  - Formatted as a signed JWT (`HS256`).
  - Claims: `sub` (User ID), `sid` (Session ID), `iss` (`latrocore-auth`), `aud` (`latrocore-client`), `iat`, `exp`.
  - Stored **strictly in memory** on the client (`inMemoryAccessToken`).
  - Never persisted to `localStorage`, `sessionStorage`, cookies, or browser URLs.
- **Long-Lived Refresh Token (7 Days)**:
  - Generated as a 64-byte cryptographically secure random string (`secrets.token_urlsafe(64)`).
  - Stored in the database **only as a SHA-256 hash**. The raw token is never saved in the database or server logs.
  - Delivered exclusively via a secure cookie named `__Host-refresh`.
- **Cookie Security Specifications**:
  - `HttpOnly = True` (inaccessible to client-side scripts, neutralizing XSS exfiltration).
  - `Secure = True` (transmitted exclusively over TLS/HTTPS).
  - `SameSite = Strict` (preventing cross-site request inclusion).
  - `Path = /`
  - No `Domain` attribute (as required by RFC 6265bis for `__Host-` prefixed cookies).
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
| **Token Transmission** | `__Host-refresh` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`) | Token sniffing, script access, subdomain hijacking |
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

### HTTPS Development Setup

RFC 6265bis mandates that cookies with the `__Host-` prefix require `Secure=True` and will be rejected by browsers over unencrypted HTTP. To maintain `Secure=True` during development without weakening cookie security:

1. **Generate development TLS certificates**:
   ```bash
   python generate_certs.py
   ```
   This generates `cert.pem` and `key.pem` with Subject Alternative Names for `localhost` and `127.0.0.1`.

2. **Run FastAPI with HTTPS**:
   ```bash
   uvicorn main:app --ssl-keyfile key.pem --ssl-certfile cert.pem --port 8000 --reload
   ```

3. **Or run with standard HTTP (proxying via Vite / Caddy / mkcert)**:
   ```bash
   uvicorn main:app --port 8000 --reload
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   The Vite dev server runs at `http://localhost:5173` and proxies `/auth`, `/dashboard`, and `/api` to the FastAPI backend at `http://127.0.0.1:8000`.

3. **Production Build**:
   ```bash
   npm run build
   ```

---

## 5. Running Automated Tests

### Backend Test Suite (Pytest)
Executes 10 automated security tests covering password verification, cookie attributes, database hashing, silent refresh rotation, reuse detection, logout invalidation, CSRF defense, and rate limiting:
```bash
cd backend
.\.venv\Scripts\pytest tests\test_auth.py -v
```

### Frontend Test Suite (Vitest)
Executes 6 automated tests verifying memory-only storage, concurrent 401 queue deduplication, refresh failure propagation, retry-loop prevention, and race condition handling:
```bash
cd frontend
npm test
```

---

## 6. Endpoints Documentation

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Rate Limiter | Verifies Argon2id password, creates session, sets `__Host-refresh` cookie, returns Access Token. |
| `POST` | `/auth/refresh` | CSRF + Cookie | Verifies cookie hash, rotates token atomically, checks reuse, returns new Access Token. |
| `POST` | `/auth/logout` | CSRF + Cookie | Revokes DB session, clears cookie with identical attributes, rejects old Access Tokens. |
| `GET` | `/auth/me` | Bearer JWT | Returns authenticated user profile from in-memory token. |
| `GET` | `/dashboard` | Bearer JWT | Protected demonstration endpoint returning telemetry and session status. |
