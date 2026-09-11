# 🚀 Smart Placement Portal (SPP)

> **Next-Generation AI-Powered Campus Recruitment, Skill Intelligence & Interview Simulator Platform**

An enterprise-grade, full-stack MERN platform engineered for university Placement & Training (TPO) cells and graduating engineering students. It connects the entire campus placement lifecycle: **Job Discovery $\rightarrow$ Eligibility Verification $\rightarrow$ AI Job Intelligence $\rightarrow$ Company-Specific Coding Practice $\rightarrow$ Standardized College Resume Builder $\rightarrow$ Live Voice Mock Interviewer $\rightarrow$ Weakness Diagnostics $\rightarrow$ Institutional Admin Analytics**.

---

## 📋 Table of Contents

- [Key Highlights](#-key-highlights)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [8-Phase Feature Overview](#-8-phase-feature-overview)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
- [🎯 What You Need to Fill & Configure](#-what-you-need-to-fill--configure)
- [Default Demo Credentials](#-default-demo-credentials)
- [Project Directory Structure](#-project-directory-structure)
- [Production & Security Hardening](#-production--security-hardening)
- [Scripts Reference](#-scripts-reference)

---

## ✨ Key Highlights

- 🏢 **End-to-End Recruitment Management**: Admins publish drives, set strict academic eligibility (CGPA, allowed branches, graduation batch, backlog limits), track applicant pipelines, and manage offers.
- 🧠 **AI JD Intelligence**: Analyzes Job Descriptions using Gemini 2.5 to extract core responsibilities, skill importance, recommended tech stacks, and job-specific prep roadmaps with permanent caching.
- 💻 **Authentic Coding Preparation Engine**: Sourced from a curated MongoDB problem database (38 verified LeetCode & GeeksforGeeks problems) filtered by company and topic. **Zero hallucinated URLs**.
- 📄 **Standardized College Resume Builder**: Enforces university placement formatting with live split-screen preview, profile auto-fill, and 1-click clean PDF export.
- 🎯 **ATS Resume Matcher**: Compares student resumes against specific JDs with sub-10ms response times powered by **SHA-256 hash caching (`resumeHash + jdHash`)**.
- 🎙️ **Live Voice Mock Interviewer**: Interactive AI interviewer with Web Speech API recognition, Web Audio recording with user consent, dynamic follow-up questioning, and speech synthesis.
- 📊 **8-Dimension Weakness Engine**: Evaluates Overall, Technical, Problem Solving, Communication, Confidence, Clarity, Answer Structure, and Conciseness with a 3-tier weakness categorization (Critical, Needs Improvement, Strong).
- 🏛️ **Admin Intelligence & Student 360**: Real-time conversion funnels, cohort-wide weakness aggregation, and complete student dossier inspections.

---

## 🛠️ Architecture & Tech Stack

```
Frontend (SPA)                         Backend (REST API)                   Data & AI Layer
┌─────────────────────────┐           ┌────────────────────────┐           ┌──────────────────────┐
│  React 19 + Vite 8      │  HTTP/    │  Node.js + Express     │  Mongoose  │  MongoDB (Local/Atlas│
│  Tailwind CSS           │  JSON     │  Helmet + Rate Limit   │───────────▶│  38 LeetCode/GFG DB  │
│  React Router v7        │──────────▶│  JWT Auth + RBAC       │            └──────────────────────┘
│  Web Speech & Audio API │  (Bearer) │  Express Controllers   │                       │
│  Code-Split (React.lazy)│           │  Resilient Fallback    │            ┌──────────────────────┐
└─────────────────────────┘           └────────────────────────┘            │  Google Gemini 2.5   │
                                                   │───────────────────────▶│  (Strict SHA-256     │
                                                                            │   Response Caching)  │
                                                                            └──────────────────────┘
```

- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express.js, JWT, bcryptjs, Helmet, Express Rate Limit, CORS.
- **Database**: MongoDB & Mongoose (with automated in-memory fallback if MongoDB is offline).
- **AI Engine**: Google Gen AI SDK (`@google/genai`) with Gemini 2.5 Flash + high-precision deterministic NLP fallback engines.

---

## 🚀 8-Phase Feature Overview

| Phase | Feature Module | Capability Description |
| :--- | :--- | :--- |
| **Phase 1** | **Foundation & UI System** | Dark-mode design system (Slate-950), responsive sidebar, JWT authentication, student/admin roles, global error boundary, unified toasts. |
| **Phase 2** | **Jobs & Application Pipeline** | Job creation, multi-field eligibility screening (CGPA, branches, batches, backlogs), application tracker (Applied $\rightarrow$ Shortlisted $\rightarrow$ OA $\rightarrow$ Technical $\rightarrow$ HR $\rightarrow$ Selected/Rejected). |
| **Phase 3** | **AI JD Intelligence Hub** | Structured JD breakdown, skill importance weighting, company-tailored interview focus areas, and job-specific prep roadmaps with permanent database caching. |
| **Phase 4** | **Coding Practice Arena** | Curated problem bank with difficulty, company, and topic filters. Real-time solve toggling, platform tagging (LeetCode/GFG), and student streak statistics. |
| **Phase 5** | **College Resume Builder & ATS** | Standardized university placement layout, live split-screen preview, profile auto-population, clean `@media print` A4 PDF export, and SHA-256 ATS gap analyzer. |
| **Phase 6** | **AI Mock Interview Simulator** | Text and voice modes with WebSpeech recognition, audio recording with explicit user consent, realistic conversational follow-up questions. |
| **Phase 7** | **Weakness Engine & Remediation** | 8-dimension scoring radar, 3-tier weakness categorization (🔴 Critical, 🟠 Needs Improvement, 🟢 Strong), targeted action plans, and chronological improvement trajectory. |
| **Phase 8** | **Admin Intelligence & Student 360** | 6 top-level placement KPIs, conversion funnel, batch weakness heatmap, and comprehensive Student 360 dossiers. |

---

## 📦 Prerequisites

Before running the project, ensure you have:
1. **Node.js** (v18.0.0 or higher recommended, verified on v24+)
2. **npm** (v9.0.0 or higher)
3. **MongoDB** (Optional: Local MongoDB or MongoDB Atlas. If not running, the portal automatically operates in resilient in-memory mode with pre-loaded mock data!)

---

## ⚡ Quick Start Guide

### Step 1: Clone or Navigate to the Repository
```bash
cd "c:\Users\Sameer Swami\OneDrive\Desktop\SmartPlacementPortal"
```

### Step 2: Configure Environment Variables
Navigate into the `server/` directory and configure the environment variables:
```bash
cd server
copy .env.example .env
```
*(See the [What You Need to Fill & Configure](#-what-you-need-to-fill--configure) section below to edit `.env`.)*

### Step 3: Install Dependencies
```bash
# In the server folder:
npm install

# In the client folder:
cd ../client
npm install
```

### Step 4: (Optional) Seed the Database
If you have MongoDB running locally and want to populate it with authentic questions and drives:
```bash
cd ../server
npm run seed
```

### Step 5: Start the Development Servers

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

Open your browser at **`http://localhost:5173`** to access the portal!

---

## 🎯 What You Need to Fill & Configure

Here is the exact checklist of items you need to configure in `server/.env`:

| Variable Name | Required? | Default / Example Value | Description & How to Obtain |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `5000` | Port on which the Express backend listens. |
| `NODE_ENV` | Optional | `development` | Set to `production` when deploying live. |
| `MONGODB_URI` | Optional | `mongodb://localhost:27017/smart_placement_portal` | **Your MongoDB connection string.** Can be a local URI or cloud URI from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). *(If left offline, the built-in resilient mock store enables 100% turnkey operation).* |
| `JWT_SECRET` | **Recommended** | `super_secret_jwt_key_smart_placement_2026_dev` | **JWT secret key.** Replace with any random 32+ character string for production security. |
| `GEMINI_API_KEY` | Optional | *(Leave blank for offline fallback)* | **Google Gemini API Key.** Get a free API key at [Google AI Studio](https://aistudio.google.com/). *(If not provided, the portal uses its built-in high-precision deterministic AI engines with zero runtime errors).* |
| `CLIENT_URL` | Optional | `https://smartplacementportal.vercel.app` | **Frontend Production Domain.** Configured for CORS whitelist and production redirection. |

### Sample `server/.env` File
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart_placement_portal
JWT_SECRET=super_secret_jwt_key_smart_placement_2026_dev
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=https://smartplacementportal.vercel.app
```

### College Customization Checklist (Optional)
If you wish to brand the portal for your specific institution:
1. **College Name & Logo**:
   - Edit the portal brand in [`Navbar.jsx`](file:///c:/Users/Sameer%20Swami/OneDrive/Desktop/SmartPlacementPortal/client/src/components/layout/Navbar.jsx) and [`Sidebar.jsx`](file:///c:/Users/Sameer%20Swami/OneDrive/Desktop/SmartPlacementPortal/client/src/components/layout/Sidebar.jsx).
   - Change `"Smart Placement Portal"` or `"National Institute of Technology"` to your institution's name.
2. **Resume Header & University Seal**:
   - In [`ResumeBuilder.jsx`](file:///c:/Users/Sameer%20Swami/OneDrive/Desktop/SmartPlacementPortal/client/src/pages/student/ResumeBuilder.jsx), adjust the college name and department in the predefined template.
3. **Allowed Academic Branches**:
   - Default branches include `Computer Science & Engineering`, `Information Technology`, `Electronics & Communication`, `Electrical Engineering`. Admins can customize these when creating or editing job drives.

---

## 🔑 Default Demo Credentials

The portal is pre-configured with active student and administrator accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Student** | `student@portal.com` | `Password123!` | Student Dashboard, Job Search, Eligibility Checker, Prepare Hub, Coding Arena, Resume Builder, ATS Analyzer, Mock Interview Simulator. |
| **Admin (TPO)** | `admin@portal.com` | `Password123!` | Admin Intelligence Dashboard, Placement Funnel, Cohort Weakness Heatmap, Job Drive Management, Applicant Pipeline, Student 360 Deep-Dive. |

*(You can also register a new account on `/register` with either the `Student` or `Admin` role).*

---

## 📁 Project Directory Structure

```
SmartPlacementPortal/
├── client/                                 # Frontend React 19 + Vite application
│   ├── public/                             # Public static assets & favicon
│   ├── src/
│   │   ├── assets/                         # SVG vectors and images
│   │   ├── components/
│   │   │   ├── common/                     # Design system (Button, Card, Badge, Modal, Skeleton, Toast, Table)
│   │   │   └── layout/                     # AppLayout, Navbar, Sidebar, ProtectedRoute
│   │   ├── context/                        # AuthContext (JWT) & ToastContext
│   │   ├── hooks/                          # useDebounce hook for search & filter inputs
│   │   ├── pages/
│   │   │   ├── admin/                      # AdminDashboard, AdminJobs, AdminApplications
│   │   │   ├── auth/                       # Login and Register
│   │   │   └── student/                    # StudentDashboard, Jobs, CodingArena, PrepareHub,
│   │   │                                   # ResumeBuilder, ResumeAnalyzer, MockInterviewArena,
│   │   │                                   # InterviewAnalysis, InterviewHub, Profile
│   │   ├── services/
│   │   │   ├── api.js                      # API client with query caching & mutation invalidation
│   │   │   └── voice/                      # WebSpeech provider & audio recording utilities
│   │   ├── App.jsx                         # App router with React.lazy code-splitting
│   │   ├── index.css                       # Design tokens & Tailwind utility classes
│   │   └── main.jsx                        # React entry point
│   ├── package.json
│   └── vite.config.js                      # Vite dev server & proxy settings
│
├── server/                                 # Backend Node.js + Express REST API
│   ├── scripts/
│   │   └── seed.js                         # Database seeder for sample drives & 38 coding questions
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                       # Mongoose connection with automatic in-memory fallback
│   │   ├── controllers/                    # Route handlers (auth, job, application, resume, interview, admin)
│   │   ├── data/
│   │   │   └── seedQuestions.js            # 38 authentic LeetCode/GFG questions with verified URLs
│   │   ├── middleware/                     # JWT authentication, RBAC authorization, global error handler
│   │   ├── models/                         # Mongoose schemas (User, Job, Application, Question, Resume, Interview)
│   │   ├── routes/                         # Express API route declarations
│   │   ├── services/                       # Gemini 2.5 SDK integration, SHA-256 caching & NLP services
│   │   └── server.js                       # Express app entry with Helmet & Rate Limiting
│   ├── .env.example                        # Template for environment configuration
│   └── package.json
│
└── README.md                               # Complete project documentation
```

---

## 🛡️ Production & Security Hardening

- **Helmet Security**: Automatically attaches `nosniff`, `SAMEORIGIN`, and XSS security headers on all HTTP responses.
- **Two-Tier Rate Limiting**:
  - Global API limiter: `600 requests / 15 minutes` per IP.
  - Strict Auth limiter: `60 requests / 15 minutes` on `/api/auth/login` and `/api/auth/register` to block brute-force attempts.
- **Role-Based Access Control (RBAC)**: Enforced via `protect` and `authorize('admin')` middlewares; students attempting admin operations receive HTTP 403 Forbidden.
- **Client Code-Splitting**: Routes are dynamically imported with `React.lazy` and `Suspense`, dropping initial JavaScript bundle size from 578 kB to 315 kB.
- **Strict AI Caching & Token Optimization**:
  - **JD unchanged?** Stored permanently in `job.aiAnalysis` (4ms – 17ms retrieval).
  - **Resume unchanged?** SHA-256 hash pair (`resumeHash + "_" + jdHash`) checks return cached ATS analysis in **< 10ms**.
  - **Interview analyzed?** Completed evaluations are persisted in MongoDB and served directly.
  - **Simple Eligibility?** Pure arithmetic code (`cgpa >= minCgpa`, `backlogs <= maxBacklogs`), 0 AI tokens spent.
  - **Question URLs?** Sourced strictly from the database, eliminating hallucinated URLs.

---

## 📜 Scripts Reference

### Backend (`server/`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in development mode using `nodemon` on port 5000. |
| `npm start` | Starts server in production mode (`node src/server.js`). |
| `npm run seed` | Seeds MongoDB with 38 authentic coding questions and initial placement drives. |

### Frontend (`client/`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches Vite local development server with Hot Module Replacement on port 5173. |
| `npm run build` | Compiles production assets into `dist/` with code-splitting. |
| `npm run preview` | Previews the compiled production build locally. |

---

## 👨‍💻 Author & Support

Developed for university training & placement offices to streamline campus drives and empower students with AI-driven placement readiness. For queries, feature requests, or contributions, please open an issue in the repository.
