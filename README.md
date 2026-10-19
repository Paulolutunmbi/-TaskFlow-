# TaskFlow &mdash; DevOps Deployment Pipeline Capstone

TaskFlow is a lightweight, responsive task management web application built for the **Ibadan Digital Academy DevOps Cohort 2 (2026)** capstone project.

This application represents the foundational **"Code"** stage of the capstone journey:

$$\textbf{Code} \longrightarrow \textbf{Container} \longrightarrow \textbf{Cloud} \longrightarrow \textbf{Kubernetes}$$

It provides a clean, responsive web dashboard alongside RESTful API endpoints for creating, tracking, filtering, editing, and managing deployment tasks.

---

## Features

- **Responsive Web Dashboard**: Works seamlessly across mobile, tablet, and desktop viewports.
- **Task Management**: Create tasks with title, description, priority (`low`, `medium`, `high`), and status (`todo`, `in-progress`, `completed`).
- **Interactive Controls**: One-click completion toggle, modal editing, and safe deletion with confirmation.
- **Dynamic Filtering & Search**: Instant filtering by status chips, priority dropdown, and keyword search.
- **Real-Time Health Monitoring**: Built-in `/health` status indicator with live uptime polling.
- **Restrained Professional Aesthetic**: Clean typography with subtle warm orange accents and no heavy frontend frameworks.

---

## Prerequisites

- **Node.js**: Version `20.x` or higher (tested on Node.js `24.x`)
- **npm**: Version `10.x` or higher
- **RAM**: Lightweight design, runs on 8 GB RAM machines with negligible memory overhead

---

## Installation

Clone the repository and install the production dependencies:

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

Start the server using npm:

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

---

## Running Automated Tests

TaskFlow uses Node.js's built-in test runner (`node:test`) and strict assertions (`node:assert/strict`), requiring zero external test runner packages:

```bash
npm test
```

### Test Coverage

The test suite covers:
- `/health` endpoint status, metadata, uptime, and headers.
- `GET /api/tasks` listing and filtering by `status`, `priority`, and `search`.
- `POST /api/tasks` validation (missing titles, length bounds, allowed priority/status enums) and creation.
- `GET /api/tasks/:id` retrieval and 404/400 handling.
- `PUT /api/tasks/:id` field updates, validation, and 404 handling.
- `DELETE /api/tasks/:id` task deletion and subsequent 404 verification.

---

## Available API Endpoints

### 1. System Health

| Method | Endpoint | Description | Sample Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Application health and uptime metadata | `{"status":"ok","app":"TaskFlow","version":"1.0.0","uptime":"42s","timestamp":"...","environment":"development"}` |

### 2. Task Management API

| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | `?status=todo`, `?priority=high`, `?search=docker` | List all tasks with optional filters |
| `GET` | `/api/tasks/:id` | None | Retrieve a single task by ID |
| `POST` | `/api/tasks` | `{ "title": "...", "description": "...", "priority": "medium", "status": "todo" }` | Create a new task (Returns `201 Created`) |
| `PUT` | `/api/tasks/:id` | `{ "title": "...", "description": "...", "priority": "...", "status": "..." }` | Update an existing task |
| `DELETE` | `/api/tasks/:id` | None | Delete a task |

#### Validation Rules:
- `title`: Required string, 1 to 100 characters.
- `description`: Optional string, max 500 characters.
- `priority`: Optional string; allowed values are `'low'`, `'medium'`, `'high'` (defaults to `'medium'`).
- `status`: Optional string; allowed values are `'todo'`, `'in-progress'`, `'completed'` (defaults to `'todo'`).

---

## Known Limitations

- **In-Memory Storage**: For this initial phase, tasks are stored in memory (`src/store.js`) for lightweight local execution. When the server restarts or the process stops, task data resets to the initial seeded state. Persistence (via a database or stateful storage) will be added in subsequent cloud architecture phases.
- **Single Instance**: In-memory state is local to the running Node.js process and not shared across multiple replica instances.

---

## Project Structure

```
devops-deployment-pipeline/
├── package.json          # Node.js project manifest & scripts
├── README.md             # Application documentation
├── .gitignore            # Git exclusion rules
├── src/
│   ├── app.js            # Express app configuration & middleware
│   ├── server.js         # HTTP server entry point & graceful shutdown
│   ├── store.js          # In-memory store with seeded capstone tasks
│   └── routes/
│       ├── health.js     # Health check endpoint (/health)
│       └── tasks.js      # Task REST API handlers (/api/tasks)
├── public/
│   ├── index.html        # Responsive semantic dashboard
│   ├── css/
│   │   └── style.css     # Bespoke stylesheet with subtle orange accent
│   └── js/
│       └── app.js        # Vanilla JS frontend controller & API client
└── test/
    ├── health.test.js    # Health endpoint automated tests
    └── tasks.test.js     # Task CRUD and filter automated tests
```
