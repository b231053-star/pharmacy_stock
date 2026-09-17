# Engineering Architecture & Solution Design Reasoning

## 1. Executive Summary & Core Constraints

Pharmaceutical stock management presents two critical, conflicting goals:
1. **Absolute Patient Safety:** Zero units from expired or compromised batches can ever be dispensed.
2. **Waste Minimization:** Near-expiry stock must be prioritized over newer stock to avoid write-offs.

A simple LIFO or FIFO stock approach leads to expired products remaining on shelves. The solution implemented here uses an enforced **First-Expiry-First-Out (FEFO)** model directly at the database query layer.

---

## 2. Schema Architecture & Domain Modeling

### Separation of Identity vs. Lot Dynamics
Instead of treating inventory as flat records with a unified quantity counter, the system separates concepts into two relational models:
* `Medicine`: Represents the catalog entity (trade name, category, reorder threshold).
* `Batch`: Represents the physical package lot (`batchNumber`, current `quantity`, `expiryDate`, operational `status`).

### Dynamic Sellable Stock vs. Cached Counters
Static counters on a medicine model introduce cache invalidation bugs when units pass their expiration date at midnight. The application dynamically aggregates in-date sellable stock on query:

$$\text{Sellable Stock} = \sum_{\text{batches}} \text{quantity} \quad \text{where } \text{expiryDate} > \text{NOW}() \land \text{status} \neq \text{'QUARANTINED'}$$

---

## 3. Algorithmic Implementation of FEFO Dispensing

When an operator requests $N$ units of a drug via `POST /api/dispense`:
1. **Validation:** Queries all active, unexpired batches matching the medicine ID, sorted by `expiryDate ASC`.
2. **Sufficiency Check:** Verifies total in-date inventory $\ge N$. If insufficient, rejects the operation immediately without partial side effects.
3. **Greedy Depletion:** Iterates through batches starting from the closest expiration date, taking $\min(\text{batch.quantity}, \text{remainingRequested})$.
4. **Atomicity:** Wraps all update statements into a single `prisma.$transaction()`, preventing race conditions during concurrent dispensing events.
5. **Reorder Evaluation:** Evaluates remaining stock against `Medicine.reorderThreshold`. If breached, queues an asynchronous notification payload into the `Outbox` table.

---

## 4. Architectural Implementation of Challenge Extensions

### Level 1 — T2: Clock Automation (`POST /clock`)
* Accepts an optional deterministic `now` timestamp for testing and simulated time jumps.
* Transitions batches with `expiryDate <= now` to `QUARANTINED`.
* Transitions active batches with `now < expiryDate <= now + 7 days` to `EXPIRING_SOON`.
* Returns an aggregated status breakdown (`active`, `expiringSoon`, `quarantined`).

### Level 2 — T4: Dirty Batch Ingestion (`POST /api/import`)
* **Quantity Normalization:** Uses regular expressions (`/\d+/`) to extract numeric integers from messy input values (`"50 units"`, `"100 tabs"`).
* **Date Parsing:** Handles varied input formats (`DD/MM/YYYY`, `DD-MM-YYYY`, ISO-8601).
* **Idempotency & Deduplication:** Tracks seen composite keys (`medicine_batchNumber`) in memory and performs lookup against existing database records to prevent duplicate allocations.
* Rejects records missing essential fields and outputs structured operational metrics: `{ imported, deduped, rejected }`.

### Level 3 — T1: Decoupled Outbox Event Notifications (`/outbox`)
* Avoids synchronous external alerting failures during dispense transactions.
* Writes low-stock alert events directly into a persistent `Outbox` database table within the same transaction flow.
* Exposes standard `GET` and `DELETE` endpoints for downstream consumer consumption.

---

## 5. Verification & Test Run Matrix

| Case | Scenario | Expected Behavior | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Clock step-forward (`POST /clock`) | Mark expired batches as `QUARANTINED`, flag $\le 7$ days as `EXPIRING_SOON` | DB updated, counts returned | **PASS** |
| **TC-02** | Dirty import (`POST /api/import`) | Parse DD/MM/YYYY, extract digits, dedupe lot numbers, reject nulls | `{ imported: 1, deduped: 1, rejected: 1 }` | **PASS** |
| **TC-03** | FEFO multi-batch dispense | Exhaust oldest lot before touching newer lot | Depleted `PARA-MESS-01` then took balance from `PARA-GOOD-03` | **PASS** |
| **TC-04** | Outbox reorder alert | In-date stock dips below 20 units | Outbox generated `REORDER_ALERT` payload | **PASS** |
