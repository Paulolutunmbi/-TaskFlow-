# TaskFlow — Shared Task Board

TaskFlow is a lightweight, responsive shared task board. Tasks created by any visitor are visible to **all other visitors** using the same deployed application and database.

> **Privacy notice:** Please do not add passwords, phone numbers, email addresses, or other sensitive personal information to tasks. Anyone with access to this application may be able to view or modify its tasks.

---

## What Is This?

TaskFlow is an **open, unauthenticated shared task board**. There are no user accounts, authentication, or individual workspaces. Every person who visits the same deployed URL sees and can interact with the same set of tasks.

- Tasks are stored in **MongoDB Atlas** and persist across page refreshes and server restarts.
- Each task requires a **display name** (e.g. a first name or team alias) so visitors can see who added each task. This is not verified or tied to an account — it is informational only.
- Anyone with access to the board can create, edit, complete, or delete any task. Do not treat tasks as private or exclusively owned by their creator.

---

## Features

- **Shared Task Board**: All visitors read and write to the same MongoDB collection.
- **Creator Name on Tasks**: Every task shows the display name of the person who created it.
- **MongoDB Persistence**: Tasks survive server restarts; no in-memory fallback in production.
- **Task Management**: Create tasks with title, description, priority (`low`, `medium`, `high`), and status (`todo`, `in-progress`, `completed`).
- **Interactive Controls**: One-click completion toggle, modal editing, and safe deletion with confirmation.
- **Dynamic Filtering & Search**: Instant filtering by status chips, priority dropdown, and keyword search.
- **Empty State**: Displays a clear prompt when no tasks exist yet.
- **Error Handling**: Displays a clear error message and retry button if the database is unavailable. Never shows fake data.
- **Health Monitoring**: Built-in `/health` and `/health/ready` endpoints reflecting real database connectivity.

---

## Prerequisites

- **Node.js**: Version `20.x` or higher (tested on Node.js `24.x`)
- **npm**: Version `10.x` or higher
- **MongoDB Atlas**: A MongoDB Atlas cluster with a valid connection string

---

## Configuration

Copy `.env.example` to `.env` and set your MongoDB connection string:

```bash
cp .env.example .env
```

Edit `.env`:

```
MONGODB_URI=<your-mongodb-atlas-connection-string>
```

> **Security:** Never commit your `.env` file or expose your `MONGODB_URI` in any public repository, log, or frontend code. The `.env` file is listed in `.gitignore`.

---

## Installation

```bash
# Clone the repository (if not already cloned)
git clone <repository-url>
cd devops-deployment-pipeline

# Install dependencies
npm install
```

---

## Running the Application

### Development / Local Run

```bash
npm start
```

Or run directly with Node:

```bash
node src/server.js
```

By default, the server listens on port `3000`. You can customize the port using the `PORT` environment variable:

```bash
# PowerShell (Windows)
$env:PORT="8080"; npm start

# Bash / Linux / macOS
PORT=8080 npm start
```

Once started, open your browser and navigate to:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **Health Endpoint**: [http://localhost:3000/health](http://localhost:3000/health)
- **Readiness Check**: [http://localhost:3000/health/ready](http://localhost:3000/health/ready)

---

## Running Automated Tests

TaskFlow uses Node.js's built-in test runner (`node:test`) and strict assertions (`node:assert/strict`), requiring zero external test runner packages:

```bash
npm test
```

### Test Coverage

The test suite covers:
- `/health` endpoint status, metadata, uptime, and headers.
- Empty board state — confirms no automatic mock-data seeding occurs.
- `GET /api/tasks` listing, `createdBy` field presence, and filtering by `status`, `priority`, and `search`.
- `POST /api/tasks` validation: missing/empty title, title length, invalid priority/status, missing/empty/whitespace `createdBy`, `createdBy` trimming, and successful creation with persistence verification.
- `GET /api/tasks/:id` retrieval and 404/400 handling.
- `PUT /api/tasks/:id` field updates, validation, and 404 handling.
- `DELETE /api/tasks/:id` task deletion and subsequent 404 verification.
- Database failure / 503 behaviour when the database is unavailable (no fake-data fallback).
- MongoDB connection string credential sanitisation (passwords masked in logs).
- Mongoose schema validation for all fields including `createdBy`.

---

## Available API Endpoints

### 1. System Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Application health and uptime metadata |
| `GET` | `/health/ready` | Readiness probe (503 if database is disconnected) |
| `GET` | `/health/live` | Liveness probe (always 200 if the process is running) |

### 2. Task Management API

| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | `?status=todo`, `?priority=high`, `?search=docker` | List all tasks with optional filters |
| `GET` | `/api/tasks/:id` | None | Retrieve a single task by ID |
| `POST` | `/api/tasks` | `{ "title": "...", "description": "...", "priority": "medium", "status": "todo", "createdBy": "Alice" }` | Create a new task (Returns `201 Created`) |
| `PUT` | `/api/tasks/:id` | `{ "title": "...", "description": "...", "priority": "...", "status": "..." }` | Update an existing task |
| `DELETE` | `/api/tasks/:id` | None | Delete a task |

#### Validation Rules:
- `title`: Required string, 1 to 100 characters.
- `description`: Optional string, max 500 characters.
- `priority`: Optional string; allowed values are `'low'`, `'medium'`, `'high'` (defaults to `'medium'`).
- `status`: Optional string; allowed values are `'todo'`, `'in-progress'`, `'completed'` (defaults to `'todo'`).
- `createdBy`: **Required** string, 1 to 80 characters. Whitespace is trimmed. No email address or account required.

---

## Project Structure

```
devops-deployment-pipeline/
├── package.json          # Node.js project manifest & scripts
├── README.md             # Application documentation
├── .env                  # Local environment config (not committed — contains MONGODB_URI)
├── .env.example          # Template for environment variables
├── .gitignore            # Git exclusion rules
├── src/
│   ├── app.js            # Express app configuration & middleware
│   ├── server.js         # HTTP server entry point & graceful shutdown
│   ├── db.js             # MongoDB connection management
│   ├── store.js          # Storage layer (MongoDB via Mongoose; in-memory test double for tests)
│   ├── models/
│   │   ├── Task.js       # Mongoose Task schema (includes createdBy field)
│   │   └── Counter.js    # Auto-incrementing numeric ID counter
│   └── routes/
│       ├── health.js     # Health check endpoints (/health, /health/ready, /health/live)
│       └── tasks.js      # Task REST API handlers (/api/tasks)
├── public/
│   ├── index.html        # Responsive shared task board UI
│   ├── css/
│   │   └── style.css     # Bespoke stylesheet
│   └── js/
│       └── app.js        # Vanilla JS frontend controller & API client
└── test/
    ├── health.test.js    # Health endpoint automated tests
    ├── tasks.test.js     # Task CRUD, filter, createdBy, and empty-state tests
    ├── database.test.js  # Mongoose schema, DB failure, and credential sanitisation tests
    └── server.test.js    # Server port selection and startup tests
```

---

## Security Considerations

- The MongoDB connection string (`MONGODB_URI`) is only used server-side and is never exposed to the browser.
- Credential sanitisation strips passwords from all MongoDB URIs before logging.
- This application has no authentication. Do not deploy it with sensitive data.
