# V-Sense — Agentic Vehicle History & Fraud Detection System

> SE3090 – Software Engineering Frameworks · Group 2026-SE-19 · SLIIT
> B.Sc. (Hons) in Information Technology, specializing in Software Engineering

V-Sense is an integrated vehicle history verification platform for the Sri Lankan used-vehicle market. Garages record verified service work, ownership and police/accident data live in one place, and a **four-agent AI workflow** audits the data for fraud and produces a QR-verifiable vehicle certificate.

## Live Links

| Resource | URL |
|---|---|
| Web portal (React) | https://v-sense-org.vercel.app |
| Mobile app (APK) | [Google Drive](https://drive.google.com/drive/folders/1B-AabLqU5zjJEkoLO4X4hdJraHSNrS7n?usp=sharing) |


## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Agentic AI Pipeline](#agentic-ai-pipeline)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Team](#team)

## Features

**Customer (Flutter mobile)**
- OTP-based registration and login
- Add a vehicle through a one-time payment (PayHere)
- View service and repair history
- Request an AI-generated certificate, track its status and download it
- QR-verifiable certificates (public verification, no login needed)
- Find nearby verified garages and book checkup appointments
- Real-time notifications and live support chat

**Organization – Garage / Service Centre (React web)**
- Search vehicles and log service records with odometer readings and photos
- Accept, reject or suggest an alternative time for appointment requests

**Administrator (React web)**
- Approve or reject garage registrations
- Human-in-the-loop (HITL) review queue for fraud-flagged reports
- AI execution logs for auditing, support tickets and notifications

**Risk-based approval:** clean reports are auto-approved and released immediately; reports with fraud indicators pause the workflow until an administrator approves or rejects them.

## Architecture

Both clients talk only to the ASP.NET Core API. The API is the only component that touches PostgreSQL, third-party services and the AI service.

```
 Flutter app (Android)      React web (Vercel)
          \                     /
           ▼                   ▼
        ASP.NET Core 8 API (Render)
          │         │          │
          ▼         ▼          ▼
   PostgreSQL   PayHere /   Agentic AI (FastAPI + LangGraph)
   (Supabase)   Text.lk /      local machine via ngrok
                Cloudinary
```

The backend follows Clean Architecture (API, Application/CQRS, Domain, Infrastructure) with SignalR hubs for notifications and live support.

## Tech Stack

| Layer | Technology |
|---|---|
| Web | React 19, Vite, Tailwind CSS |
| Mobile | Flutter (Android APK), `flutter_secure_storage` |
| Backend | ASP.NET Core 8, EF Core, SignalR, JWT |
| Database | PostgreSQL (Supabase) |
| Agentic AI | Python, FastAPI, LangGraph, LangChain, Google Gemini |
| Integrations | PayHere (payments), Text.lk (SMS OTP), Cloudinary (media) |
| CI/CD | GitHub Actions |

## Agentic AI Pipeline

| Agent | Role |
|---|---|
| Agent 1 – Coordinator | Builds the fixed four-step plan and fetches the vehicle profile |
| Agent 2 – History Analysis | Analyses service history and the mileage timeline |
| Agent 3 – Fraud Detection | Audits odometer rollbacks, date anomalies, unverified garages, ownership churn |
| Agent 4 – Valuation & Validation | Produces the valuation and structured buyer report, decides auto-approve vs. admin review |

The plan is deterministic, so the LLM cannot skip or reorder checks. Workflow state is stored in PostgreSQL (`AIWorkflows`), and tool arguments are never trusted blindly.

## Repository Structure

```
V-Sense/
├── .github/workflows/     # backend-ci.yml
├── agentic-ai/            # FastAPI + LangGraph agents
├── backend/               # ASP.NET Core 8 (Clean Architecture)
│   ├── VSense.API/
│   ├── VSense.Application/
│   ├── VSense.Domain/
│   ├── VSense.Infrastructure/
│   ├── VSense.Tests/
│   └── VSenseBackend.sln
├── docs/                  # ADRs, diagrams, testing docs, screenshots
├── frontend-web/          # React + Vite dashboard (Garages & Admin)
└── mobile/                # Flutter app
```

## Getting Started

### Prerequisites
.NET 8 SDK · Node.js 18+ · Flutter SDK · Python 3.11 · PostgreSQL · ngrok

### 1. Backend
```bash
cd backend
dotnet restore
dotnet run --project VSense.API
```
EF Core migrations are applied automatically at startup. Swagger is served at `/swagger`.

### 2. Agentic AI service
```bash
cd agentic-ai
pip install -r requirements.txt
# create .env with GEMINI_API_KEY and the Supabase PostgreSQL connection settings
uvicorn main:app --reload      # adjust to your entry point
ngrok http <port>              # copy the HTTPS URL into AiAgentUrl in the backend
```

### 3. Web
```bash
cd frontend-web
npm install
npm run dev
```
Set `VITE_API_BASE_URL` to your API URL.

### 4. Mobile
```bash
cd mobile
flutter pub get
flutter run
```
Build a release APK with `flutter build apk --release`. Location permission is required for the nearby garages feature.

## Environment Variables

Backend (set on Render or in user-secrets, never committed):

| Variable | Purpose |
|---|---|
| `ConnectionStrings__DefaultConnection` | Database connection |
| `AllowedOrigins`, `FrontendUrl`, `AiAgentUrl` | CORS, frontend URL, AI service URL |
| `JwtSettings__Secret` / `__Issuer` / `__Audience` | JWT configuration |
| `TEXTLK_API_TOKEN`, `TEXTLK_SENDER_ID` | SMS OTP |
| `CloudinarySettings__CloudName` / `__ApiKey` / `__ApiSecret` | Media storage |
| `PayHereSettings__MerchantId` / `__MerchantSecret` / `__Sandbox` | Payments |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Email |
| `AdminSeed__Email`, `AdminSeed__Password` | Seeded admin account |

Agentic AI: `GEMINI_API_KEY`, `CHAT_MODEL`, Supabase PostgreSQL connection settings.
Web: `VITE_API_BASE_URL`.

## Testing

| Area | Tooling |
|---|---|
| Backend | xUnit, Moq, coverlet |
| Flutter | `flutter_test`, WidgetTester |
| Agentic AI and security | pytest, pytest-mock, pytest-asyncio |
| API E2E | Postman / Newman |
| Browser E2E | Playwright |
| Security scan | OWASP ZAP |

```bash
# Backend
dotnet test backend/VSenseBackend.sln

# Agentic AI + security
cd agentic-ai && pytest tests/ -v

# API end-to-end
npx newman run VSense_E2E_Workflow.json -e VSense_Env.json

# Flutter
cd mobile && flutter test
```

## Deployment

| Component | Platform |
|---|---|
| ASP.NET Core API | Render (redeploys on push to `main`) |
| PostgreSQL | Supabase |
| React web | Vercel |
| Agentic AI | Local machine exposed through ngrok |
| Mobile | Android APK (release build) |

## Team

| Student ID | Name | GitHub | Component |
|---|---|---|---|
| IT24100356 | Rajapakshe R.P.P.S | [@SadeshRaj](https://github.com/SadeshRaj) | Customer Support & Certification, Agent 4 – Valuation & Validation |
| IT24101124 | Pinsara R.W.B | [@Binuk32](https://github.com/Binuk32) | Vehicle & Payments (mobile), Agent 3 – Fraud Detection |
| IT24100185 | Kameshika G.K.H.P | [@PamindithKameshika](https://github.com/PamindithKameshika) | Notifications & Organization appointments, Agent 1 – Coordinator |
| IT24100033 | Sanjana P.K.D | [@DilkiSanjana](https://github.com/DilkiSanjana) | Organization & Service Records, Agent 2 – History Analysis |

## License
Developed for academic purposes as part of SE3090 at SLIIT.
