# V-Sense: Premium Vehicle History & Valuation Authority

## System Startup Instructions

This repository contains a full-stack integrated application encompassing an ASP.NET Core API, a React web frontend, a Flutter mobile application, and a Python-based Agentic AI subsystem.

Because this is a polyglot monorepo, each component must be installed and started individually from its respective directory.

---

### 1. Backend (ASP.NET Core API)
The backend manages all business logic, PostgreSQL database connections, and secure authentication.

**Prerequisites:** .NET 8.0 SDK

**Using an IDE (Recommended):**
Open `backend/VSenseBackend.sln` using JetBrains Rider or Visual Studio and run the `VSense.API` project.

**Using the Terminal:**
```bash
cd backend
# Restore NuGet dependencies
dotnet restore
# Run the API
dotnet run --project VSense.API
```

---

### 2. Web Application (React)
The React application serves as the dashboard for staff, admins, and the AI approval workflow.

**Prerequisites:** Node.js

**Using the Terminal:**
```bash
cd frontend-web
# Install dependencies
npm install
# Start the Vite development server
npm run dev
```

---

### 3. Mobile Application (Flutter)
The Flutter application is used by customers for service requests and by field inspectors for data collection.

**Prerequisites:** Flutter SDK, iOS Simulator or Android Emulator

**Using the Terminal:**
```bash
cd mobile
# Retrieve Flutter packages
flutter pub get
# Launch the application on an available emulator/device
flutter run
```

---

### 4. Agentic AI Subsystem (Python)
The AI subsystem processes multi-agent workflows for vehicle fraud detection and valuation.

**Prerequisites:** Python 3.x

**Using the Terminal:**
```bash
cd agentic-ai
# Create a virtual environment
python3 -m venv .venv
# Activate the virtual environment
source .venv/bin/activate
# Install required Python packages
pip install -r requirements.txt
# Start the FastAPI server on port 8000
uvicorn api.main:app --reload --port 8000

test karanna - python test_agent4.py
```
