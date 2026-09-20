# CREDIFY.ai

**AI Scam & Fraud Warning Assistant**

Paste any suspicious SMS, call transcript, email, link, or UPI payment request and get an
instant, explainable risk verdict — so people can stop a scam **before** they lose money,
instead of reporting it after.

---

## Why this matters

| Figure | Detail | Source |
| --- | --- | --- |
| 27,248 → 86,420 | Cybercrime cases in India, 2018 → 2023 | NCRB |
| ~7× | Rise in financial-fraud complaints on the National Cyber Crime Reporting Portal, 2021 → 2024 | I4C / NCRP |
| 41× | Rise in losses over the same period — ₹551 crore → **₹22,848 crore** | I4C / NCRP |
| ₹55,050 crore | Cumulative reported losses across 65.8 lakh+ complaints, 2021 – mid-2026 | I4C / NCRP |
| 77% / 8% / 7% | Share of losses by value: investment scams / digital-arrest scams / credit-card fraud | I4C / NCRP |
| ₹11,158 crore+ | Saved by government helplines; accounts frozen on 32.8 lakh+ complaints; 9.42 lakh+ fraudulent SIMs blocked | I4C |

Losses are growing far faster than the number of complaints. Reporting is a cure, not a
prevention — and everything before the moment of deciding whether to click is currently
unassisted. That moment is what CREDIFY.ai addresses.

**Target users:** everyday smartphone and UPI users, with emphasis on senior citizens,
students and first-time digital-payment users. Secondary: bank and telecom fraud teams,
via the analyst dashboard.

---

## Quick start

Run the backend and frontend in separate terminals from the repository root.

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r ..\requirements.txt
python seed.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The Vite development server proxies `/api` requests to the local FastAPI server.

- Frontend: <http://127.0.0.1:5173/>
- Backend: <http://127.0.0.1:8000/>
- API documentation: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/api/health>

### Demo credentials

| Email | Password | Role |
| --- | --- | --- |
| `demo@scamshield.in` | `Demo@123` | user |
| `analyst@scamshield.in` | `Analyst@123` | analyst — can verify reports and add blocklist entries |
| `admin@scamshield.in` | `Admin@123` | admin |

The scanner works **without signing in**. An account only keeps your history.

## Deploying with Render and Vercel

The repository includes `render.yaml` for the FastAPI service and
`frontend/vercel.json` for client-side route fallback.

### 1. Deploy the backend to Render

1. Create a new Render Blueprint from this repository.
2. Render detects `render.yaml` and creates the `credify-api` web service.
3. In the service environment settings, set `CORS_ORIGINS` to a JSON array containing
  the final Vercel URL, for example:

  ```text
  ["https://credify.vercel.app"]
  ```

4. Copy the deployed API URL and verify `/api/health` returns `status: ok`.

The free Render service uses the repository SQLite file on ephemeral storage. It is
appropriate for a demo, but user accounts, scans, and seeded data can reset after a
redeploy or restart. Use a paid persistent disk and set `DATABASE_URL`, or migrate to
PostgreSQL, before relying on it for permanent data.

### 2. Deploy the frontend to Vercel

1. Import the same repository into Vercel.
2. Set the project root directory to `frontend`.
3. Use the default Vite settings, or set:

  ```text
  Build command: npm run build
  Output directory: dist
  ```

4. Add the environment variable `VITE_API_URL` with the Render API URL, such as
  `https://credify-api.onrender.com`.
5. Deploy, then replace the temporary Vercel URL in Render's `CORS_ORIGINS` value with
  the final frontend URL.

After changing `CORS_ORIGINS`, redeploy the Render service. Do not commit either
`.env` file or production secrets.

---

## 3-minute demo script for judges

> Have the app open at <http://127.0.0.1:5173/> before you start.

**0:00 — The problem (20s).** Land on the home page. The four counters animate as you
scroll: ₹22,848 Cr lost in 2024, a 41× rise since 2021, 1.9 Cr complaints, ₹55,050 Cr lost
in total. *"Losses are growing far faster than complaints. Every existing tool helps after
the money is gone."*

**0:20 — It actually works, right here (40s).** The hero has a **live scanner**, already
filled with a real fake-KYC SMS. Click **Check this message**. A verdict card appears in
about a second: **High Risk, 100/100, Fake KYC / Bank Alert**, with the first three
reasons. *"This is the real model, on the landing page, with no login."*

**1:00 — Explainability is the product (50s).** Go to **Scanner**. Click the sample
**"Fake KYC deadline"** and scan it. Walk through the result card:
- the gauge sweeps to the score, the verdict band is colour-coded;
- **Why we flagged this** — eight plain-language reasons, no jargon: *"The address uses the
  name 'sbi' but the real website it belongs to is 'sbi-verify-kyc.info', which is not owned
  by that company."*
- **Words that influenced the score** — red chips pushed towards scam, green towards safe;
- **What we found inside** — the link and UPI ID, each checked against the blocklist;
- **What to do now** — a Do / Do-not playbook plus the 1930 reporting route.

**1:50 — It does not cry wolf (25s).** Click **Scan another**, then the sample **"Genuine
OTP alert"** — *"Your OTP for login is 738291. Do not share this OTP with anyone."*
Result: **Safe, 1/100**. *"It contains the words OTP, bank and share. A keyword filter flags
this. Our rule engine is negation-aware, so a real bank SMS stays Safe — that is what makes
the warnings worth reading."*

**2:15 — Scale and the analyst view (35s).** Open **Dashboard**. Four KPIs with
period-over-period deltas and sparklines, a stacked area chart (hover any day for the exact
breakdown), the category donut, risk by channel, live advisories, and the top flagged
indicators. Switch **30 days → 7 days** to show it re-querying live.

**2:50 — Close (10s).** Hit the **theme toggle** in the navbar — the whole product is
correct in dark mode. *"Runs fully offline, no external API, no data leaves the machine."*

**Backup one-liners if asked:**
- *Accuracy?* 98.15% held-out, 98.51% 5-fold CV on a 536-row curated corpus.
- *Why a linear model?* Because it gives a signed weight per word for free — that is the
  explainability layer. A black box would score the same and break the product's premise.
- *Cross-channel?* Try the **Call** tab's digital-arrest sample, or the **UPI** tab's
  collect-request sample.

---

## How detection works

Five channels — `message`, `call`, `email`, `url`, `upi` — and twelve scam categories:
fake KYC, lottery/prize, job/investment, digital arrest, OTP phishing, UPI collect,
parcel/customs, loan app, romance/matrimonial, tech support, charity, and safe.

Seven engines run over every input, in parallel:

| Engine | What it looks for |
| --- | --- |
| **Text model** (`text_engine.py`) | TF-IDF over word 1–2 grams **and** character 3–5 grams into a calibrated LinearSVC. Returns a probability plus the top 5 signed token contributions. |
| **Rules** (`rules.py`) | 20 weighted, explainable red flags: urgency, authority impersonation, credential requests, money lures, advance fees, secrecy pressure, remote access, QR traps, Hinglish variants. |
| **URL** (`url_engine.py`) | Raw-IP hosts, shorteners, abused TLDs, brand names outside the registrable domain, punycode/homoglyphs, excessive subdomains, credential-bait paths, missing HTTPS — plus an allowlist of genuine official domains. |
| **UPI** (`upi_engine.py`) | Collect-vs-pay direction, "enter your PIN to receive", QR-to-receive, refund bait, ₹1 trust tests, unknown PSP handles, payee-vs-claimed-identity mismatch. |
| **Email** (`email_engine.py`) | Display-name vs From-domain mismatch, Reply-To and Return-Path redirects, lookalike sender domains, free webmail claiming to be a bank, alarmist subject lines. |
| **Call** (`call_engine.py`) | Digital-arrest phrasing, "do not disconnect", "safe / RBI verification account", identity probing, and the score bump when several script markers co-occur. |
| **Threat intel** | Extracted domains, UPI IDs and phone numbers checked against the local blocklist, which grows from every high-risk scan and verified community report. |

### Fusion

```
base       = ml_probability × 100          (×0.35 for a bare link — no sentence context)
rule_score = min(sum of rule weights, 70)

if rule_score == 0:  final = round(0.5 × base)                       # damp ML-only noise
else:                final = round(0.6×base + 0.4×min(base+rule_score, 100))
                     final = max(final, rule_score)

final += 0.45 × min(url + upi + email + call + intel, 60)            # capped at 100
```

Bands: **0–34 Safe · 35–64 Suspicious · 65–100 High Risk**, plus a confidence derived from
how many independent engines agreed.

**The design decision that matters most:** an ML-only signal is halved. A bag-of-words model
is jumpy on short text, and a fraud warning that cries wolf is worse than useless — people
stop reading it. Model confidence only compounds when concrete evidence agrees with it.

**The false positive we care about most:** the credential rule masks negated verb phrases
before looking for an actual request, so *"Your OTP is 738291, do not share it with anyone"*
stays **Safe** while *"Please share the OTP you received"* is flagged.

---

## API

Everything is under `/api`. Interactive docs at `/docs`.

```
POST   /api/auth/register            create an account
POST   /api/auth/login               JWT (OAuth2 password form)
GET    /api/auth/me                  current user

POST   /api/analyze                  single analysis — works with OR without auth
POST   /api/analyze/bulk             CSV upload → results + summary

GET    /api/scans                    paginated history: channel, verdict, category, dates, q, sort
GET    /api/scans/{id}               single scan detail
GET    /api/scans/export?format=csv  CSV download
DELETE /api/scans/{id}               delete your own scan

GET    /api/dashboard/summary        KPIs + deltas + sparklines
GET    /api/dashboard/timeseries     ?days=30 → daily verdict breakdown
GET    /api/dashboard/categories     category share
GET    /api/dashboard/channels       count and average risk per channel
GET    /api/dashboard/top-threats    most-reported indicators
GET    /api/dashboard/alerts         active advisories
GET    /api/dashboard/geography      report volume by state (sample data, labelled as such)
GET    /api/dashboard/meta           taxonomy for filter menus

GET    /api/intel/lookup?value=x     is this domain / UPI ID / phone known-bad?
GET    /api/intel                    paginated blocklist
POST   /api/intel                    analyst or admin only

POST   /api/community/report         submit a scam you received
GET    /api/community/reports        verified public feed
PATCH  /api/community/reports/{id}   analyst or admin: verify / reject
```

---

## Tests

**Backend — 45 tests**

```bash
cd backend
python -m pytest tests/ -q
```

Covers auth and role enforcement, analysis with and without a login, entity extraction,
bulk CSV, history filtering and export, every dashboard aggregate, intel lookup and
promotion, community reporting, the negation-aware credential rule, URL/UPI engine
behaviour, verdict bands, determinism, and an assertion that **no jargon leaks into any
user-facing reason string**.

**Frontend — Playwright smoke test**

```bash
cd frontend
npx playwright install chromium
npm run test:e2e            # backend must be running
```

Nine tests covering the landing page's live scanner, the fake-KYC and genuine-OTP paths
through the scanner, every dashboard widget, theme toggle persistence, demo sign-in, intel
lookup, and keyboard reachability of the skip link — plus two sweeps across every route:
one at 360px asserting **no horizontal scroll anywhere**, and one at 1440px in **dark
theme**. Every test asserts **zero console errors and zero React warnings**.

**Model**

```bash
cd backend/ml
python train_model.py       # prints accuracy + full classification report
```

Held-out accuracy **0.9815**, 5-fold CV **0.9851 ± 0.0152** on 536 rows (280 scam / 256 safe).

---

## Project layout

```
backend/
  main.py config.py database.py models.py schemas.py security.py seed.py
  routers/    auth · analyze · scans · dashboard · intel · community
  engines/    text_engine · rules · url_engine · upi_engine · email_engine
              call_engine · categorizer · fusion
  ml/         dataset.csv · generate_dataset.py · train_model.py · model.joblib
  tests/      test_api.py
frontend/
  src/api/client.js
  src/context/     AuthContext · ThemeContext
  src/styles/      tokens · base · components · layout · pages
  src/components/  layout/ · ui/ · charts/ · domain/
  src/pages/       Landing · Scanner · Dashboard · History · Community
                   ThreatIntel · Login · About · Gallery
  tests/smoke.spec.js
```

> The design system is split across `components.css` (primitives), `layout.css` (app shell,
> dashboard, charts) and `pages.css` (landing, scanner, auth) rather than one file, purely
> for navigability. `tokens.css` remains the single source of colour, type and spacing.

## Design system

Concept: **trusted security console**. Deep navy, one confident cyan accent, and a strict
semantic risk palette.

- Every colour, size, radius and shadow is a token in `tokens.css`. **No raw hex in any
  component.**
- Green / amber / red are reserved **exclusively** for risk level and never used for
  decoration. The category donut deliberately uses blues, violets and teals so a slice can
  never be misread as "this category is dangerous".
- Light and dark themes are both complete. The theme is applied by an inline script in
  `index.html` before first paint, so there is no flash of the wrong theme.
- Every interactive element has a visible `:focus-visible` ring; the app is fully
  keyboard-navigable; the modal traps and restores focus.
- All motion is ≤ 250 ms and disabled under `prefers-reduced-motion`.
- Responsive at 360 / 768 / 1280 / 1600 px. Nothing scrolls horizontally; wide tables
  scroll inside their own container.
- **All charts are hand-rolled SVG** — no charting library.

Visit **`/gallery`** to see every primitive, variant and state rendered at once, in either
theme.

---

## Privacy and scope

- Runs **fully offline**. No external or paid API is called at any point.
- Scan content is truncated to 2,000 characters before storage, and the UI says so.
- No real personal data is stored or required.
- CREDIFY.ai **detects and explains**. It does not block calls, freeze accounts, or contact
  anyone on your behalf, and a Safe verdict is not a guarantee.
- **If money has already gone: report at [cybercrime.gov.in](https://cybercrime.gov.in) or
  call 1930.** Reporting in the first few hours is what makes a freeze possible.
