# 🏛️ Smart Placement Portal (SPP) — Full System Design Document

> **Document Version:** 1.0.0  
> **Status:** Production-Grade Architecture  
> **Target Audience:** Engineering Leads, System Architects, Full-Stack Developers, DevOps Engineers, and Technical Evaluators.

---

## 📑 Table of Contents

1. [Executive Summary & System Objectives](#1-executive-summary--system-objectives)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component Architecture & Tech Stack](#3-component-architecture--tech-stack)
4. [End-to-End Functional Workflows & Sequence Diagrams](#4-end-to-end-functional-workflows--sequence-diagrams)
5. [3-Tier Caching Architecture & Stampede Protection](#5-3-tier-caching-architecture--stampede-protection)
6. [Data Models & Persistence Layer](#6-data-models--persistence-layer)
7. [API Design & Route Catalog](#7-api-design--route-catalog)
8. [Security, Authentication & RBAC](#8-security-authentication--rbac)
9. [Failure Modes & Graceful Degradation](#9-failure-modes--graceful-degradation)
10. [Docker Containerization & Infrastructure Topology](#10-docker-containerization--infrastructure-topology)
11. [Performance Benchmarks & Capacity Planning](#11-performance-benchmarks--capacity-planning)
12. [Future Roadmap & Extensibility](#12-future-roadmap--extensibility)

---

## 1. Executive Summary & System Objectives

The **Smart Placement Portal (SPP)** is an enterprise campus recruitment, career intelligence, and interview acceleration platform designed for university Training & Placement Cells (TPOs) and graduating students.

### 1.1 Core Business Problems Solved
* **Inefficient Drive Management**: Manual eligibility checking across diverse academic criteria (CGPA, active backlogs, allowed branches, graduation batches) leads to administrative errors and ineligible submissions.
* **Lack of Role-Specific Intelligence**: Generic student preparation fails to align with actual job descriptions (JDs) and company-specific assessment patterns.
* **Prohibitive AI Cost & Latency**: LLM-driven job analysis and resume auditing without robust caching lead to high API expenses, rate-limiting, and slow page loads.
* **Fragmented Student Preparation**: Disconnect between coding practice, resume formatting, mock interviews, and actionable weakness remediation.

### 1.2 Core Architectural Principles
1. **Sub-Millisecond Read Acceleration**: In-memory Redis caching for frequently accessed job directories and deterministic AI analyses.
2. **Deterministic 3-Tier AI Flow**: Identical inputs (JDs, resumes) always return cached results, preventing redundant LLM calls.
3. **Fail-Open Resilience**: Infrastructure interruptions (Redis offline, MongoDB restarting, Gemini API rate-limited) degrade gracefully to secondary stores or deterministic rule engines without crashing user requests.
4. **Single-Flight Stampede Protection**: Simultaneous requests for uncached AI operations are deduplicated into a single in-flight promise.
5. **Strict Data Confidentiality**: Passwords, tokens, academic eligibility evaluations, and student records are never cached in volatile layers.

---

## 2. High-Level System Architecture

The Smart Placement Portal utilizes a decoupled, modern multi-tier architecture with an in-memory acceleration layer, containerized micro-services, and external AI integrations.

```
                              ┌────────────────────────┐
                              │  Client Tier (Browser) │
                              │   React 19 + Vite 8    │
                              │   Tailwind CSS (SPA)   │
                              └───────────┬────────────┘
                                          │
                        HTTP / HTTPS REST │ WebSocket (Live Voice)
                                          ▼
                              ┌────────────────────────┐
                              │  API Gateway / Ingress │
                              │   Vite Reverse Proxy   │
                              │   (Port 5173 ➔ 5000)   │
                              └───────────┬────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │   Backend Application  │
                              │     Node.js + Express  │
                              │   Rate Limit + Helmet  │
                              │    RBAC + JWT Engine   │
                              └─────┬────────────┬─────┘
                                    │            │
             Cache-Aside (Tier 1)   │            │ Mongoose ODM (Tier 2)
                                    ▼            ▼
                     ┌────────────────┐        ┌────────────────┐
                     │  Redis 7 Cache │        │  MongoDB 7.0   │
                     │  (In-Memory)   │        │ (Atlas Cloud)  │
                     └────────────────┘        └────────────────┘
                                                       │
                                   External LLM Tier 3 │
                                                       ▼
                                        ┌────────────────────────┐
                                        │    Google Gemini API   │
                                        │  (Gemini 3.6 / Live)   │
                                        └────────────────────────┘
```

---

## 3. Component Architecture & Tech Stack

### 3.1 Frontend Tier (`/client`)
* **Framework**: React 19 SPA bootstrapped with Vite 8.
* **Routing**: React Router DOM v7 with code-splitting via `React.lazy` and `Suspense`.
* **Styling & Design System**: Tailwind CSS with custom slate-950 dark mode, CSS variables, and glassmorphic panels.
* **Audio & Speech Recognition**:
  * Web Speech API (`webkitSpeechRecognition`) for low-latency browser-native speech-to-text.
  * Web Audio API (`MediaRecorder`) for capturing student vocal audio buffers with explicit user consent.
  * Native SpeechSynthesis for speech playback.
* **Icons & Animation**: Lucide React for consistent SVG iconography; Canvas Confetti for placement celebration triggers.

### 3.2 Backend Tier (`/server`)
* **Runtime**: Node.js (v20+ Alpine containerized, verified on Node v24).
* **Framework**: Express.js with modular routing, centralized controllers, and custom middleware.
* **Real-Time Communication**: Native `ws` WebSocket server mounted on the same HTTP port for bidirectional Gemini Live audio/text streaming.
* **Security Middleware**:
  * `helmet`: Injects secure HTTP headers (XSS filtering, HSTS, frameguard).
  * `express-rate-limit`: Throttles brute-force login and API flooding.
  * `cors`: Configured to client origins (`CLIENT_URL`).
  * `jsonwebtoken` & `bcryptjs`: Stateless JWT authentication with salted password hashing (10 rounds).

### 3.3 Persistence & Cache Tier
* **Primary Database**: MongoDB 7.0 utilizing Mongoose ODM. Features automated in-memory mock store fallback when operating offline.
* **In-Memory Acceleration**: Redis 7 Alpine managed via `ioredis` with exponential backoff connection retries and fail-open read/write wrappers.

### 3.4 AI Intelligence Tier
* **Google Gen AI SDK** (`@google/genai`): Gemini 3.6 Flash for structured JSON extraction (roadmaps, skill rankings, ATS keyword matching).
* **Gemini Live Audio Preview**: Low-latency bidirectional WebSocket audio streaming for conversational mock interviews.
* **Deterministic NLP Fallback Engine**: Rule-based keyword parsers, Levenshtein distance metrics, and algorithmic ATS evaluators for offline operation.

---

## 4. End-to-End Functional Workflows & Sequence Diagrams

### 4.1 Student Eligibility & Application Flow
Eligibility validation enforces academic prerequisites prior to application submission.

```
Student               Client               Backend              Database
   │                     │                    │                     │
   │── Click "Apply" ───▶│                    │                     │
   │                     │── POST /jobs/:id ─▶│                     │
   │                     │    /apply          │── Fetch Job & User ─▶
   │                     │                    │◀── Return Records ──│
   │                     │                    │                     │
   │                     │                    │── Check Criteria:   │
   │                     │                    │   1. CGPA >= Min    │
   │                     │                    │   2. Branch allowed │
   │                     │                    │   3. Batch matches  │
   │                     │                    │   4. Backlogs <= Max│
   │                     │                    │                     │
   │                     │                    │── [If Ineligible] ──┐
   │                     │◀── 400 Ineligible ─│                     │
   │◀── Display Reason ──│   with explanation │                     │
   │                     │                    │── [If Eligible] ────┘
   │                     │                    │── Create App Record ─▶
   │                     │◀── 201 Success ────│◀── Stored in DB ─────│
   │◀── Update Status ───│                    │                     │
```

### 4.2 AI JD Intelligence (3-Tier Cache Strategy)
Ensures zero redundant AI API invocations when students access job preparation roadmaps.

```
Student               Client               Backend           Redis (T1)       MongoDB (T2)       Gemini (T3)
   │                     │                    │                  │                 │                  │
   │── View Prep Hub ───▶│                    │                  │                 │                  │
   │                     │── GET /jobs/:id/ ─▶│                  │                 │                  │
   │                     │    prepare         │── Check Key ────▶│                 │                  │
   │                     │                    │◀─ [HIT] Cached ──│                 │                  │
   │                     │◀── 200 From Redis ─│                  │                 │                  │
   │                     │                    │                  │                 │                  │
   │                     │                    │── [MISS] ─────────────────────────▶│                  │
   │                     │                    │◀─ [HIT] Return job.aiAnalysis ─────│                  │
   │                     │                    │── Repopulate ───▶│                 │                  │
   │                     │◀── 200 From DB ────│                  │                 │                  │
   │                     │                    │                                    │                  │
   │                     │                    │── [MISS Both] Lock & Execute ────────────────────────▶│
   │                     │                    │◀── Return Structured JSON ────────────────────────────│
   │                     │                    │── Write to DB ────────────────────▶│                  │
   │                     │                    │── Write to Redis ▶                 │                  │
   │                     │◀── 200 Fresh AI ───│                                    │                  │
```

### 4.3 Deterministic Resume ATS Evaluation
Evaluates student resumes against job descriptions using deterministic SHA-256 pair matching.

```
Formula:  resumeHash = SHA256(normalize(resumeText))
          jdHash     = SHA256(normalize(jdText))
          cacheKey   = ai:resume-analysis:{resumeHash}:{jdHash}:v1
```

* If candidate resubmits without changing resume text: **Instant Redis/MongoDB match (0ms latency, 0 AI tokens)**.
* If candidate updates resume text: `resumeHash` changes naturally, evaluating only the updated profile.

---

## 5. 3-Tier Caching Architecture & Stampede Protection

### 5.1 The Cache-Aside Contract
1. **Redis is strictly an acceleration tier**: The system never relies on Redis for permanent storage.
2. **MongoDB remains the source of truth**: If Redis is flushed, restarted, or offline, data is served from MongoDB.
3. **Fail-Open safety**: Every cache method (`get`, `set`, `del`, `remember`) wraps underlying Redis network calls in safe error catch blocks that log warnings and fail open.

### 5.2 Deterministic Key Hierarchy

```
Root Prefix
 ├── ai:
 │    ├── jd-analysis:{jdHash}:{version}
 │    ├── resume-analysis:{resumeHash}:{jdHash}:{version}
 │    └── prep-plan:{jobId}:{jdHash}:{version}
 ├── jobs:
 │    ├── detail:{jobId}:v1
 │    └── list:{filterHash}:v1
 ├── questions:
 │    ├── raw:all:v1
 │    └── list:{filterHash}:v1
 ├── admin:
 │    └── intelligence:v1
 ├── user:
 │    └── {userId}:resume:*
 └── lock:
      └── {resourceName}
```

### 5.3 TTL & Invalidation Policy

| Category | Key Pattern | TTL | Invalidation Trigger |
| :--- | :--- | :--- | :--- |
| **AI JD Intelligence** | `ai:jd-analysis:{hash}:{v}` | 24 Hours (86,400s) | Job Description text updated by Admin. |
| **AI Resume ATS Match** | `ai:resume-analysis:{r}:{j}:{v}` | 12 Hours (43,200s) | Candidate edits resume; naturally bypassed by new `rHash`. |
| **AI Prep Roadmaps** | `ai:prep-plan:{id}:{hash}:{v}` | 24 Hours (86,400s) | Drive updated or un-published. |
| **Job Details** | `jobs:detail:{id}:v1` | 5 Minutes (300s) | Admin edits drive, deletes drive, or changes status. |
| **Job Directory Listing** | `jobs:list:{filterHash}:v1` | 2 Minutes (120s) | Admin creates, modifies, or toggles status of any drive. |
| **Question Catalog** | `questions:raw:all:v1` | 10 Minutes (600s) | Admin triggers question generation / database mutations. |
| **Admin Analytics KPIs** | `admin:intelligence:v1` | 60 Seconds (60s) | Invalidation triggered immediately on new applications, stage changes, or drive updates. |
| **Distributed Lock** | `lock:{resource}` | 15 Seconds | Automatically expires via Redis TTL if caller process terminates. |

### 5.4 Stampede & Dogpiling Protection (Single-Flight Pattern)
When multiple concurrent requests query the same missing AI resource, standard caches suffer a **Cache Stampede** (all requests hit the LLM simultaneously).

SPP resolves this via an **In-Flight Promise Registry** in [`cacheService.js`](file:///c:/Users/Sameer%20Swami/OneDrive/Desktop/SmartPlacementPortal/server/src/services/cache/cacheService.js):

```javascript
// Single-Flight Deduplication Logic
if (options.deduplicate && inFlightRequests.has(key)) {
  const sharedPromise = inFlightRequests.get(key);
  return { data: await sharedPromise, cached: true, source: 'in-flight-dedup' };
}

const executionPromise = (async () => {
  const result = await fetcherFn();
  await this.set(key, result, ttlSeconds);
  return result;
})();

inFlightRequests.set(key, executionPromise);
try {
  const data = await executionPromise;
  return { data, cached: false };
} finally {
  inFlightRequests.delete(key);
}
```

* **Result**: Tested under **10, 50, and 100 simultaneous requests**, exactly **1 AI call** is made. Duplicate AI calls are reduced by **90% to 99%**.

### 5.5 Enterprise Connection Layer & Cloud Resilience (`redis.js`)

1. **Multi-Mode Connection Resolver**:
   * **URI Mode**: Supports `REDIS_URL` with standard (`redis://`) and TLS encrypted (`rediss://`) protocols.
   * **Host/Port/Auth Mode**: Supports `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and `REDIS_USERNAME` for standalone or managed cloud instances (Upstash, AWS ElastiCache, Redis Cloud, Render).
   * **TLS Encryption**: Configurable via `REDIS_TLS=true` with customizable CA certificate authorization (`REDIS_TLS_REJECT_UNAUTHORIZED`).

2. **Credential Sanitization & Observability**:
   * Outgoing connection logs sanitize embedded passwords (e.g. `redis://:***@host:port`) to eliminate credential leakage into Docker standard streams or cloud logging platforms.
   * Active application-level ping probe (`pingRedis()`) verifies bidirectional responsiveness beyond simple TCP socket states.

3. **Real-Time Health & Diagnostic Endpoints**:
   * `GET /api/health`: Provides high-level health including live database connection and Redis status (`connected` / `disconnected`) with PING response.
   * `GET /api/health/cache`: Diagnostic telemetry endpoint returning key count distributions across prefixes (`ai:`, `jobs:`, `questions:`, `admin:`, `lock:`), live PING round-trip latency, and endpoint host.


---

## 6. Data Models & Persistence Layer

### 6.1 Database Entity Relationship (ER) Model

```
 ┌──────────────────────┐         1:N         ┌──────────────────────┐
 │        User          │────────────────────▶│     Application      │
 ├──────────────────────┤                     ├──────────────────────┤
 │ _id: ObjectId        │                     │ _id: ObjectId        │
 │ email: String (UQ)   │                     │ student: Ref(User)   │
 │ role: 'student'|'adm'│                     │ job: Ref(Job)        │
 │ profile: Object      │                     │ status: Enum         │
 │ academics: Object    │                     │ timeline: Array      │
 └──────────────────────┘                     └──────────────────────┘
            │                                            │
            │ 1:1                                        │ N:1
            ▼                                            ▼
 ┌──────────────────────┐                     ┌──────────────────────┐
 │     ResumeData       │                     │         Job          │
 ├──────────────────────┤                     ├──────────────────────┤
 │ user: Ref(User)      │                     │ _id: ObjectId        │
 │ personal: Object     │                     │ title: String        │
 │ education: Array     │                     │ company: Object      │
 │ skills: Object       │                     │ eligibility: Object  │
 │ projects: Array      │                     │ status: Enum         │
 │ experience: Array    │                     │ aiAnalysis: Object   │
 └──────────────────────┘                     └──────────────────────┘
            │                                            │
            └────────────────────┬───────────────────────┘
                                 │
                                 ▼ Evaluated Against
                      ┌──────────────────────┐
                      │    ResumeAnalysis    │
                      ├──────────────────────┤
                      │ cacheKey: String(UQ) │
                      │ resumeHash: String   │
                      │ jdHash: String       │
                      │ matchPercentage: Num │
                      │ atsScore: Number     │
                      │ strongSkills: Array  │
                      │ missingSkills: Array │
                      └──────────────────────┘
```

### 6.2 Key Indexes
* `users.email`: Unique index for fast credential checks.
* `jobs.status`: Compound index with `postedBy` for directory queries.
* `applications.job + applications.student`: Unique compound index preventing double applications.
* `resumeanalyses.cacheKey`: Unique index for instant O(1) Tier-2 MongoDB lookups.

---

## 7. API Design & Route Catalog

### 7.1 Authentication & Profile
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | All | Register student or admin account. |
| `POST` | `/api/auth/login` | Public | All | Verify credentials & issue JWT token. |
| `GET` | `/api/auth/profile` | Bearer | All | Return authenticated user document. |
| `PUT` | `/api/auth/profile` | Bearer | Student | Update academic, branch, and profile info. |

### 7.2 Jobs & Application Pipeline
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/jobs` | Bearer | All | Cached listing of active drives with search/filter. |
| `GET` | `/api/jobs/:id` | Bearer | All | Return drive details and student eligibility status. |
| `POST` | `/api/jobs` | Bearer | Admin | Create job drive (invalidates job directory cache). |
| `PUT` | `/api/jobs/:id` | Bearer | Admin | Update job drive & purge associated caches. |
| `DELETE` | `/api/jobs/:id` | Bearer | Admin | Soft/hard delete job drive. |
| `POST` | `/api/jobs/:id/apply`| Bearer | Student | Verify 4-point eligibility and submit application. |
| `GET` | `/api/jobs/:id/prepare`| Bearer| Student | 3-tier cached JD intelligence & preparation plan. |

### 7.3 Coding Practice & Questions
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/questions` | Bearer | All | Fetch problem database (company, topic, platform). |
| `POST` | `/api/questions/:id/toggle`| Bearer| Student| Toggle problem completion status. |

### 7.4 Resume & ATS Analysis
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/resume/my-resume`| Bearer| Student| Load saved college placement resume JSON. |
| `POST`| `/api/resume/save` | Bearer | Student | Persist resume updates & clear user resume cache. |
| `POST`| `/api/resume/analyze-jd`| Bearer| Student| SHA-256 pair cached ATS analysis vs. target JD. |

### 7.5 Mock Interview & Live Voice
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/interview/start` | Bearer | Student | Initialize mock interview session record. |
| `POST` | `/api/interview/:id/submit`| Bearer| Student| Submit turn response & receive follow-up. |
| `POST` | `/api/interview/:id/finish`| Bearer| Student| Run 8-dimension weakness & scoring analysis. |
| `WS` | `/ws/live-interview` | Token | Student | Duplex audio/text socket stream with Gemini Live. |

### 7.6 Admin Analytics & Observability
| Method | Path | Auth | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | Bearer | Admin | Batch KPIs, conversion funnels, weakness radar. |
| `GET` | `/api/admin/student/:id`| Bearer | Admin | Student 360 dossier with practice trajectory. |
| `GET` | `/health` | Public | System | Returns basic service liveliness status ('OK'). |
| `GET` | `/api/health` | Public | System | Returns MongoDB, Redis socket, and live PING status. |
| `GET` | `/api/health/cache` | Public | System | Returns Redis cache breakdown across key namespaces. |


---

## 8. Security, Authentication & RBAC

### 8.1 Stateless JWT Authentication
* **Token Standard**: Signed HS256 JWT tokens carrying `{ id, role, email }`.
* **Header Format**: `Authorization: Bearer <token>`.
* **Secret Management**: Stored in environment variable `JWT_SECRET`; fallback warning emitted if default key is detected.

### 8.2 Role-Based Access Control (RBAC) Matrix

```
Endpoint Scope           Student Role         Admin / TPO Role       Public
─────────────────────────────────────────────────────────────────────────────
Public Healthcheck             ✅                    ✅                ✅
Auth (Login/Register)          ✅                    ✅                ✅
View Jobs & Eligibility        ✅                    ✅                ❌
Submit Application             ✅                    ❌                ❌
AI Prep Hub & ATS              ✅                    ✅                ❌
Coding Practice Arena          ✅                    ✅                ❌
Conduct Mock Interview         ✅                    ❌                ❌
Post / Edit / Delete Jobs      ❌                    ✅                ❌
Update Applicant Status        ❌                    ✅                ❌
Institutional Analytics        ❌                    ✅                ❌
Student 360 Inspection         ❌                    ✅                ❌
```

### 8.3 Security Hardening Practices
1. **Never Cache Sensitive State**: Auth tokens, passwords, and student application statuses are strictly excluded from Redis.
2. **Password Cryptography**: `bcryptjs` with 10 salt rounds executed asynchronously on user creation/modification.
3. **No Dynamic Code Evaluation**: No `eval()` or unsanitized function constructors; strict JSON parsing with schema boundaries.
4. **Rate Limiting**: Throttles brute-force attempts on sensitive endpoints.

---

## 9. Failure Modes & Graceful Degradation

| Failure Scenario | Immediate System Behavior | User Impact | Automatic Recovery |
| :--- | :--- | :--- | :--- |
| **Redis Server Down (OFF)** | `cacheService` fails-open. All reads return `null`, writes return `false`. Requests fall through directly to MongoDB. | None. Minor increase in latency (10-40ms) as DB is queried directly. | Reconnection retries every 2 seconds. Resumes caching once Redis responds. |
| **Redis Restart** | In-flight operations safely fail-open; volatile memory clears. Subsequent reads report clean MISS and reload from DB. | Zero downtime. Cache repopulates on next read. | Resumes normal caching immediately upon socket reconnection. |
| **MongoDB Restart** | `db.js` dynamically detects `readyState !== 1` and switches to in-memory fallback mode. | Active sessions continue using in-memory mock store without crashing. | Once MongoDB readyState returns to 1, system routes back to MongoDB. |
| **Gemini AI API Outage** | `geminiService.js` and `resumeService.js` catch errors and route to deterministic NLP engines. | Users still receive valid analysis, roadmaps, and scores. | When API recovers, live AI generation resumes automatically. |
| **Malformed AI Response** | JSON parse exception is caught in try/catch block; triggers fallback builder. | User receives structured roadmap without 500 error screens. | Self-healing; erroneous response discarded. |
| **Client Disconnection** | WebSockets detect close event, flush partial buffers, and terminate active live session cleanly. | Session marked incomplete; student can restart session. | Connection resources cleaned up on server. |

---

## 10. Docker Containerization & Infrastructure Topology

### 10.1 Production Cloud Deployment Topology

The live platform operates across best-in-class cloud managed infrastructure:
* **Frontend SPA**: Hosted on **Vercel** (`https://smartplacementportal.vercel.app`) with global edge CDN distribution, asset compression, and instant client updates.
* **Backend API & WebSockets**: Hosted on **Render** (Node.js 20+ runtime) with automated HTTPS termination, horizontal scaling, and native WebSocket support for Gemini Live.
* **Database (Tier 2)**: Hosted on **MongoDB Atlas Cloud** (`mongodb+srv://...`) featuring automated multi-region replication, continuous backups, point-in-time recovery, and zero local host dependency.
* **In-Memory Cache (Tier 1)**: Optional Cloud Redis integration (Upstash / Redis Cloud / AWS ElastiCache). If unconfigured, the portal cleanly defaults to serving directly from MongoDB Atlas without connection errors or log noise.

### 10.2 Stateless Local Development Topology (`docker-compose.yml`)

For local testing or containerized verification, Docker Compose provisions an isolated internal network without creating persistent named volumes on the host disk:

```
                           spp-network (Bridge)
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   ┌────────────────┐      Proxy       ┌─────────────────┐   │
    │   │  spp-frontend  │ ───────────────▶ │   spp-backend   │   │
    │   │  (Port 5173)   │  /api and /ws    │   (Port 5000)   │   │
    │   └────────────────┘                  └────────┬────────┘   │
    │                                                │            │
    │                       ┌────────────────────────┴────────┐   │
    │                       ▼                                 ▼   │
    │              ┌─────────────────┐               ┌─────────────────┐
    │              │   spp-mongodb   │               │    spp-redis    │
    │              │  (Port 27017)   │               │   (Port 6379)   │
    │              │  (Stateless)    │               │  (Stateless)    │
    │              └─────────────────┘               └─────────────────┘
    └─────────────────────────────────────────────────────────────┘
```

* **Zero-Footprint Statelessness**:
  * Local containers run purely ephemeral in-container storage without binding to named host volumes (`spp_mongodb_data`, `spp_redis_data`).
  * Stopping containers cleans all runtime state, ensuring developer machines remain free of disk bloat and stale mock records.
* **Boot Sequencing & Health Checks**:
  * `spp-mongodb`: Verified via `mongosh --eval "db.adminCommand('ping')"`.
  * `spp-redis`: Verified via `redis-cli ping`.
  * `spp-backend`: Waits for `spp-mongodb` and `spp-redis` to be healthy, probed via `wget --spider http://localhost:5000/health`.
  * `spp-frontend`: Waits for `spp-backend` to be healthy before starting.
* **Image Minimization**:
  * Build stages prune dev-dependencies.
  * Multi-stage `.dockerignore` files prevent copying test scripts, benchmark logs, and documentation into production images.

---

## 11. Performance Benchmarks & Capacity Planning

### 11.1 Stampede & Concurrency Benchmarks (Measured)
Executed via automated test suite [`benchmarkCache.js`](file:///c:/Users/Sameer%20Swami/OneDrive/Desktop/SmartPlacementPortal/server/scripts/benchmarkCache.js):

```
===============================================================
                     BENCHMARK SUMMARY TABLE                   
===============================================================
 Concurrent Req | AI Calls Made | Calls Saved | Cost Savings | Latency 
----------------+---------------+-------------+--------------+---------
 10             | 1             | 9           | 90.0%        | 45 ms
 50             | 1             | 49          | 98.0%        | 42 ms
 100            | 1             | 99          | 99.0%        | 46 ms
===============================================================
```

### 11.2 Cold Start vs. Warm Cache Latency
* **Cold Request (Cache MISS $\rightarrow$ Gemini 3.6 API Call)**: `1,800 ms – 3,200 ms`
* **Warm Request (Cache HIT $\rightarrow$ Redis Tier 1)**: `< 1 ms`
* **Database Offload**: 100% of repeated job reads offloaded from MongoDB during active hiring windows.

---

## 12. Future Roadmap & Extensibility

1. **Multi-Instance Horizontal Scaling**: Integrate Redis Sentinel / Redis Cluster with distributed locks (`acquireLock`/`releaseLock`) across clustered backend replicas.
2. **CDN Asset Offload**: Distribute Vite production bundles via Cloudflare / CloudFront edges for global sub-50ms static asset delivery.
3. **Asynchronous Notification Queue**: Utilize Redis BullMQ or Kafka for campus-wide email and push alert dispatches on drive announcements.
4. **Vector Database Integration**: Augment ATS matching with Pinecone or Milvus embeddings for semantic resume-to-job matching alongside exact keyword tokenization.

---

*This document serves as the architectural reference for the Smart Placement Portal.*
