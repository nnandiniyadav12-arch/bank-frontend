# NexaBank — Bank Account Management System
## Full-Stack DBMS Mini Project

### Project Structure
```
bams/
├── sql/
│   └── schema.sql          ← MySQL database schema + sample data + queries
├── backend/
│   ├── server.js           ← Node.js / Express REST API
│   └── package.json        ← npm dependencies
└── frontend/
    └── index.html          ← Complete HTML/CSS/JS frontend
```

---

## STEP 1 — Set Up the Database (MySQL)

1. Open **MySQL Workbench** (or any MySQL 8+ client)
2. Open `sql/schema.sql`
3. Run the entire script — it will:
   - Create the `NexaBank` database
   - Create all 7 tables with PKs and FKs
   - Insert sample data (5 branches, 10 bankers, 10 customers, 12 accounts, 18 transactions, 7 loans, 14 loan payments, 6 credit cards)
   - Create 2 useful views
   - Include 10 report queries at the bottom

---

## STEP 2 — Start the Backend (Node.js)

### Requirements
- Node.js 16+ installed
- MySQL server running on `localhost:3306`

### Setup
```bash
cd backend
npm install
```

### Configure DB credentials
Open `backend/server.js` and update lines 17–20:
```js
user:     'root',       // ← your MySQL username
password: '',           // ← your MySQL password
```

### Run
```bash
node server.js
# or for auto-reload:
npx nodemon server.js
```

Server starts at: **http://localhost:3000**

---

## STEP 3 — Open the Frontend

Option A (via backend — recommended):
- Copy `frontend/index.html` into the `backend/` folder
- Visit: **http://localhost:3000**

Option B (direct):
- Open `frontend/index.html` directly in a browser
- The frontend calls `http://localhost:3000/api` automatically

---

## API Endpoints

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | /api/dashboard                  | Summary stats + recent data  |
| GET    | /api/branches                   | All branches with stats      |
| GET    | /api/bankers                    | All bankers                  |
| POST   | /api/bankers                    | Add new banker               |
| DELETE | /api/bankers/:id                | Remove banker                |
| GET    | /api/customers?search=          | All customers (searchable)   |
| GET    | /api/customers/:id              | Full customer profile        |
| POST   | /api/customers                  | Register customer + account  |
| PUT    | /api/customers/:id              | Update customer              |
| DELETE | /api/customers/:id              | Delete customer              |
| GET    | /api/accounts?type=             | All accounts (filterable)    |
| POST   | /api/accounts                   | Open new account             |
| GET    | /api/transactions?type=         | All transactions             |
| POST   | /api/transactions               | Post transaction (w/ balance)|
| GET    | /api/loans?loan_type=           | All loans (filterable)       |
| POST   | /api/loans                      | Issue new loan               |
| GET    | /api/loans/:id/payments         | Payments for a loan          |
| POST   | /api/loans/:id/payments         | Record EMI payment           |
| GET    | /api/creditcards                | All credit cards             |
| POST   | /api/creditcards                | Issue new card               |
| GET    | /api/reports/branch-summary     | Branch-wise report           |
| GET    | /api/reports/monthly-txn        | Monthly txn summary          |

---

## Database Tables

| Table        | Key Columns                                              |
|--------------|----------------------------------------------------------|
| Branch       | branch_id, branch_name, address, name (manager), assets |
| Banker       | banker_id, name, branch_id (FK), role                   |
| Customer     | customer_id, name, dob, mobile_no, branch_id (FK)       |
| Account      | account_id, balance, type, customer_id (FK), branch_id  |
| Transaction  | transaction_id, account_id (FK), amount, type           |
| Loan         | loan_id, amount, issued_amount, remaining_amount, borrower_id (FK) |
| LoanPayment  | loan_payment_id, loan_id (FK), payment_amount, method   |
| CreditCard   | credit_card_id, expiry_date, card_limit, customer_id (FK)|
