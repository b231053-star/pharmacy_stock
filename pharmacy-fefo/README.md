# PharmaFEFO — Intelligent Pharmacy Inventory & Dispensing Engine

PharmaFEFO is a production-grade pharmacy inventory management system built on strict **First-Expiry-First-Out (FEFO)** principles. It guarantees that healthcare providers always dispense stock with the nearest valid expiration date first, isolates expired lots from sellable figures, and prevents expired inventory from reaching consumers.

---

## 1. Product Landing Overview

* **Product Value:** Automated FEFO allocation that eliminates human error during batch picking and cuts inventory write-offs.
* **Target Audience:** Independent retail chemists, outpatient hospital pharmacies, and regional medical distribution hubs.
* **Core Value Metric:** Zero expired units dispensed, guaranteed through query-level date bounds and database transactions.
* **Three Immediate Roadmap Features:**
  1. GS1 DataMatrix 2D Barcode scanner integration for automated intake and dispensing workflows.
  2. Supplier automated return authorizations for batches within 15 days of shelf expiration.
  3. Multi-branch automated load-balancing and inter-depot inventory transfers.

---

## 2. Technical Stack

* **Framework:** Next.js 14 (App Router, TypeScript, React Server/Client Components)
* **Persistence & ORM:** SQLite via Prisma ORM (Atomic transactions, strict foreign keys)
* **Styling:** Tailwind CSS (Responsive operational dashboard and public landing page)
* **Authentication:** Session and credentials-based authentication with `bcryptjs`

---

## 3. Getting Started & Setup

### Prerequisites
* Node.js >= 18.0.0
* npm >= 9.0.0

### Installation & Initialization
```bash
# Clone the repository and navigate into the workspace
git clone <repository_url>
cd pharmacy-fefo

# Install project dependencies
npm install

# Apply database migrations and seed baseline datasets
npx prisma db push
npx tsx prisma/seed.ts

# Launch local development server
npm run dev
The application runs locally on http://localhost:3000.

Default Operator Credentials
Email: admin@pharmacy.com

Password: admin123

4. REST API Specification
Authentication
POST /api/auth

Payload: { action: "login" | "register", email: "...", password: "...", name?: "..." }

Response: { success: true, user: { id, email, name } }

Inventory Management
GET /api/medicines

Query Parameters: search (string), sort (name|category), order (asc|desc), page (number), limit (number)

Behavior: Computes active, sellable stock on the fly by excluding lots where expiryDate <= NOW() or status = 'QUARANTINED'.

POST /api/medicines

Payload: { name: string, category?: string }

POST /api/batches

Payload: { medicineId: string, batchNumber: string, quantity: number, expiryDate: string }

Dispensing Engine
POST /api/dispense

Payload: { medicineId: string, quantity: number }

Behavior: Atomically deducts inventory using FEFO order (expiryDate ASC). Triggers a persistent outbox alert if remaining stock drops below the reorder threshold.

System Automation & Challenge Extensions
POST /clock (or /api/clock)

Payload: { now?: string } (Optional ISO 8601 timestamp)

Behavior: Quarantines expired batches, transitions batches with <= 7 days remaining shelf-life to EXPIRING_SOON, and returns system-wide batch distribution totals.

POST /api/import

Payload: Array of raw batch records with heterogeneous key names and date/quantity formats.

Behavior: Sanitizes quantity strings, parses multiple date conventions (DD/MM/YYYY, ISO), deduplicates identical batch entries, and rejects malformed rows.

Response: { imported: number, deduped: number, rejected: number, details: { errors: [...] } }

GET /outbox (or /api/outbox)

Behavior: Retrieves queued low-stock reorder alerts generated during dispense routines.

DELETE /outbox

Behavior: Flushes processed alerts from the queue.
