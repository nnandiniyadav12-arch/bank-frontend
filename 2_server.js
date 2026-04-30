// ============================================================
//   BANK ACCOUNT MANAGEMENT SYSTEM — Node.js Backend
//   File: server.js
//   Run: npm install && node server.js
//   API base: http://localhost:3000/api
// ============================================================

const express    = require('express');
const mysql      = require('mysql2/promise');
const cors       = require('cors');
const bodyParser = require('body-parser');
const open = (...args) => import('open').then(m => m.default(...args));
const app  = express();
const PORT = 3000;
app.use(express.static(__dirname));

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend'));   // serves index.html automatically

// ── DB Connection Pool ───────────────────────────────────────
const pool = mysql.createPool({
    host:     'localhost',
    port:     3306,
    user:     'root',          // ← change if needed
    password: '1234',              // ← change to your MySQL password
    database: 'NexaBank',
    waitForConnections: true,
    connectionLimit:    10,
});

// Helper to run queries
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// ── Response Helpers ─────────────────────────────────────────
const ok   = (res, data)    => res.json({ success: true,  data });
const fail = (res, msg, e)  => res.status(400).json({ success: false, error: msg, detail: e?.message });

// ============================================================
//  DASHBOARD
// ============================================================
app.get('/api/dashboard', async (req, res) => {
    try {
        const [totalDeposits] = await query(`SELECT COALESCE(SUM(balance),0) AS total FROM Account`);
        const [totalCustomers]= await query(`SELECT COUNT(*) AS total FROM Customer`);
        const [totalAccounts] = await query(`SELECT COUNT(*) AS total FROM Account`);
        const [totalLoans]    = await query(`SELECT COALESCE(SUM(remaining_amount),0) AS total, COUNT(*) AS count FROM Loan WHERE status='Active'`);
        const [overdueCount]  = await query(`SELECT COUNT(*) AS total FROM Loan WHERE due_date < CURDATE() AND status='Active'`);
        const [txnCount]      = await query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM Transaction`);

        const recentTxns = await query(`
            SELECT t.transaction_id, t.amount, t.transaction_type, t.description, t.transaction_date,
                   a.account_id, a.type AS account_type,
                   c.name AS customer_name
            FROM Transaction t
            JOIN Account  a ON t.account_id  = a.account_id
            JOIN Customer c ON a.customer_id = c.customer_id
            ORDER BY t.transaction_date DESC LIMIT 8`);

        const topAccounts = await query(`
            SELECT a.account_id, a.type, a.balance,
                   c.name AS customer_name, b.branch_name
            FROM Account a
            JOIN Customer c ON a.customer_id = c.customer_id
            JOIN Branch   b ON a.branch_id   = b.branch_id
            ORDER BY a.balance DESC LIMIT 5`);

        ok(res, {
            stats: {
                totalDeposits:  totalDeposits.total,
                totalCustomers: totalCustomers.total,
                totalAccounts:  totalAccounts.total,
                outstandingLoans: totalLoans.total,
                activeLoans:    totalLoans.count,
                overdueLoans:   overdueCount.total,
                txnCount:       txnCount.total,
                txnVolume:      txnCount.volume
            },
            recentTransactions: recentTxns,
            topAccounts
        });
    } catch(e) { fail(res, 'Dashboard fetch failed', e); }
});

// ============================================================
//  BRANCHES
// ============================================================
app.get('/api/branches', async (req, res) => {
    try {
        const rows = await query(`
            SELECT b.*,
                   COUNT(DISTINCT a.account_id)  AS total_accounts,
                   COUNT(DISTINCT cu.customer_id) AS total_customers,
                   COUNT(DISTINCT bk.banker_id)  AS total_bankers,
                   COALESCE(SUM(a.balance),0)    AS total_deposits
            FROM Branch b
            LEFT JOIN Account  a  ON b.branch_id = a.branch_id
            LEFT JOIN Customer cu ON b.branch_id = cu.branch_id
            LEFT JOIN Banker   bk ON b.branch_id = bk.branch_id
            GROUP BY b.branch_id`);
        ok(res, rows);
    } catch(e) { fail(res, 'Branches fetch failed', e); }
});

// ============================================================
//  BANKERS
// ============================================================
app.get('/api/bankers', async (req, res) => {
    try {
        const rows = await query(`
            SELECT bk.*, b.branch_name,
                   COUNT(l.loan_id)                      AS loans_approved,
                   COALESCE(SUM(l.issued_amount), 0)     AS total_disbursed
            FROM Banker bk
            JOIN Branch b ON bk.branch_id = b.branch_id
            LEFT JOIN Loan l ON bk.banker_id = l.borrower_id
            GROUP BY bk.banker_id`);
        ok(res, rows);
    } catch(e) { fail(res, 'Bankers fetch failed', e); }
});

app.post('/api/bankers', async (req, res) => {
    const { name, branch_id, role, email, joined_date } = req.body;
    if (!name || !branch_id) return fail(res, 'name and branch_id are required');
    try {
        const result = await query(
            `INSERT INTO Banker (name, branch_id, role, email, joined_date) VALUES (?,?,?,?,?)`,
            [name, branch_id, role || 'Loan Officer', email || null, joined_date || null]
        );
        ok(res, { banker_id: result.insertId, message: 'Banker added' });
    } catch(e) { fail(res, 'Failed to add banker', e); }
});

app.delete('/api/bankers/:id', async (req, res) => {
    try {
        await query(`DELETE FROM Banker WHERE banker_id=?`, [req.params.id]);
        ok(res, { message: 'Banker removed' });
    } catch(e) { fail(res, 'Failed to remove banker', e); }
});

// ============================================================
//  CUSTOMERS
// ============================================================
app.get('/api/customers', async (req, res) => {
    try {
        const { search } = req.query;
        let sql = `
            SELECT c.*, b.branch_name,
                   COUNT(DISTINCT a.account_id)     AS total_accounts,
                   COALESCE(SUM(a.balance), 0)      AS total_balance,
                   COUNT(DISTINCT l.loan_id)        AS active_loans,
                   COUNT(DISTINCT cc.credit_card_id) AS credit_cards
            FROM Customer c
            LEFT JOIN Branch     b  ON c.branch_id   = b.branch_id
            LEFT JOIN Account    a  ON c.customer_id = a.customer_id
            LEFT JOIN Loan       l  ON c.customer_id = l.customer_id AND l.status='Active'
            LEFT JOIN CreditCard cc ON c.customer_id = cc.customer_id`;
        const params = [];
        if (search) {
            sql += ` WHERE c.name LIKE ? OR c.mobile_no LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += ` GROUP BY c.customer_id ORDER BY c.customer_id`;
        ok(res, await query(sql, params));
    } catch(e) { fail(res, 'Customers fetch failed', e); }
});

app.get('/api/customers/:id', async (req, res) => {
    try {
        const [cust] = await query(`
            SELECT c.*, b.branch_name FROM Customer c
            JOIN Branch b ON c.branch_id = b.branch_id
            WHERE c.customer_id=?`, [req.params.id]);
        if (!cust) return fail(res, 'Customer not found');

        const accounts = await query(`SELECT * FROM Account WHERE customer_id=?`, [req.params.id]);
        const loans    = await query(`SELECT * FROM Loan    WHERE customer_id=?`, [req.params.id]);
        const cards    = await query(`SELECT * FROM CreditCard WHERE customer_id=?`, [req.params.id]);
        const txns     = await query(`
            SELECT t.* FROM Transaction t
            JOIN Account a ON t.account_id = a.account_id
            WHERE a.customer_id=?
            ORDER BY t.transaction_date DESC LIMIT 10`, [req.params.id]);

        ok(res, { ...cust, accounts, loans, credit_cards: cards, recent_transactions: txns });
    } catch(e) { fail(res, 'Customer detail failed', e); }
});

app.post('/api/customers', async (req, res) => {
    const { name, dob, mobile_no, email, address, branch_id,
            account_type, opening_balance } = req.body;
    if (!name || !dob || !mobile_no || !branch_id)
        return fail(res, 'name, dob, mobile_no, branch_id required');
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [custRes] = await conn.execute(
            `INSERT INTO Customer (name,dob,mobile_no,email,address,branch_id) VALUES (?,?,?,?,?,?)`,
            [name, dob, mobile_no, email||null, address||null, branch_id]
        );
        const cid = custRes.insertId;
        const [accRes] = await conn.execute(
            `INSERT INTO Account (balance,type,customer_id,branch_id,opened_date) VALUES (?,?,?,?,CURDATE())`,
            [opening_balance || 0, account_type || 'Savings', cid, branch_id]
        );
        await conn.commit();
        ok(res, { customer_id: cid, account_id: accRes.insertId, message: 'Customer registered' });
    } catch(e) {
        await conn.rollback();
        fail(res, mobile_no && e.code === 'ER_DUP_ENTRY'
            ? 'Mobile number already registered' : 'Failed to create customer', e);
    } finally { conn.release(); }
});

app.put('/api/customers/:id', async (req, res) => {
    const { name, dob, mobile_no, email, address } = req.body;
    try {
        await query(
            `UPDATE Customer SET name=?,dob=?,mobile_no=?,email=?,address=? WHERE customer_id=?`,
            [name, dob, mobile_no, email||null, address||null, req.params.id]
        );
        ok(res, { message: 'Customer updated' });
    } catch(e) { fail(res, 'Update failed', e); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await query(`DELETE FROM Customer WHERE customer_id=?`, [req.params.id]);
        ok(res, { message: 'Customer deleted' });
    } catch(e) { fail(res, 'Delete failed', e); }
});

// ============================================================
//  ACCOUNTS
// ============================================================
app.get('/api/accounts', async (req, res) => {
    try {
        const { type } = req.query;
        let sql = `
            SELECT a.*, c.name AS customer_name, b.branch_name
            FROM Account a
            JOIN Customer c ON a.customer_id = c.customer_id
            JOIN Branch   b ON a.branch_id   = b.branch_id`;
        const params = [];
        if (type && type !== 'All') { sql += ` WHERE a.type=?`; params.push(type); }
        sql += ` ORDER BY a.balance DESC`;
        ok(res, await query(sql, params));
    } catch(e) { fail(res, 'Accounts fetch failed', e); }
});

app.post('/api/accounts', async (req, res) => {
    const { customer_id, branch_id, type, balance } = req.body;
    if (!customer_id || !branch_id || !type) return fail(res, 'customer_id, branch_id, type required');
    try {
        const result = await query(
            `INSERT INTO Account (balance,type,customer_id,branch_id,opened_date) VALUES (?,?,?,?,CURDATE())`,
            [balance || 0, type, customer_id, branch_id]
        );
        ok(res, { account_id: result.insertId, message: 'Account opened' });
    } catch(e) { fail(res, 'Failed to open account', e); }
});

// ============================================================
//  TRANSACTIONS
// ============================================================
app.get('/api/transactions', async (req, res) => {
    try {
        const { type, account_id, limit = 50 } = req.query;
        let sql = `
            SELECT t.*, a.type AS account_type, c.name AS customer_name, b.branch_name
            FROM Transaction t
            JOIN Account  a ON t.account_id  = a.account_id
            JOIN Customer c ON a.customer_id = c.customer_id
            JOIN Branch   b ON a.branch_id   = b.branch_id
            WHERE 1=1`;
        const params = [];
        if (type && type !== 'All') { sql += ` AND t.transaction_type=?`; params.push(type); }
        if (account_id)             { sql += ` AND t.account_id=?`;       params.push(account_id); }
        sql += ` ORDER BY t.transaction_date DESC LIMIT ?`;
        params.push(parseInt(limit));
        ok(res, await query(sql, params));
    } catch(e) { fail(res, 'Transactions fetch failed', e); }
});

app.post('/api/transactions', async (req, res) => {
    const { account_id, amount, transaction_type, description } = req.body;
    if (!account_id || !amount || !transaction_type)
        return fail(res, 'account_id, amount, transaction_type required');
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[acc]] = await conn.execute(
            `SELECT balance FROM Account WHERE account_id=? FOR UPDATE`, [account_id]
        );
        if (!acc) throw new Error('Account not found');
        if (transaction_type === 'Debit' && acc.balance < amount)
            throw new Error('Insufficient balance');
        const newBalance = transaction_type === 'Credit'
            ? parseFloat(acc.balance) + parseFloat(amount)
            : parseFloat(acc.balance) - parseFloat(amount);
        await conn.execute(`UPDATE Account SET balance=? WHERE account_id=?`, [newBalance, account_id]);
        const [txnRes] = await conn.execute(
            `INSERT INTO Transaction (account_id,amount,transaction_type,description) VALUES (?,?,?,?)`,
            [account_id, amount, transaction_type, description || 'Manual Entry']
        );
        await conn.commit();
        ok(res, { transaction_id: txnRes.insertId, new_balance: newBalance, message: 'Transaction posted' });
    } catch(e) {
        await conn.rollback();
        fail(res, e.message || 'Transaction failed', e);
    } finally { conn.release(); }
});

// ============================================================
//  LOANS
// ============================================================
app.get('/api/loans', async (req, res) => {
    try {
        const { loan_type } = req.query;
        let sql = `
            SELECT l.*, c.name AS customer_name, bk.name AS banker_name,
                   br.branch_name,
                   ROUND((l.remaining_amount/l.amount)*100,2) AS pct_remaining,
                   CASE WHEN l.due_date < CURDATE() THEN 'OVERDUE' ELSE 'Active' END AS loan_status_calc,
                   (SELECT COUNT(*) FROM LoanPayment lp WHERE lp.loan_id=l.loan_id) AS payment_count
            FROM Loan l
            JOIN Customer c  ON l.customer_id = c.customer_id
            JOIN Banker   bk ON l.borrower_id = bk.banker_id
            JOIN Branch   br ON l.branch_id   = br.branch_id
            WHERE l.status='Active'`;
        const params = [];
        if (loan_type && loan_type !== 'All') { sql += ` AND l.loan_type=?`; params.push(loan_type); }
        sql += ` ORDER BY l.loan_id`;
        ok(res, await query(sql, params));
    } catch(e) { fail(res, 'Loans fetch failed', e); }
});

app.get('/api/loans/:id/payments', async (req, res) => {
    try {
        const payments = await query(
            `SELECT * FROM LoanPayment WHERE loan_id=? ORDER BY payment_date DESC`,
            [req.params.id]
        );
        ok(res, payments);
    } catch(e) { fail(res, 'Payments fetch failed', e); }
});

app.post('/api/loans', async (req, res) => {
    const { customer_id, borrower_id, branch_id, loan_type,
            amount, issued_amount, interest_rate, issue_date, due_date } = req.body;
    if (!customer_id || !amount || !loan_type) return fail(res, 'Required fields missing');
    try {
        const result = await query(`
            INSERT INTO Loan
              (amount,issued_amount,remaining_amount,loan_type,interest_rate,
               issue_date,due_date,customer_id,borrower_id,branch_id)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [amount, issued_amount||amount, issued_amount||amount,
             loan_type, interest_rate||10, issue_date, due_date,
             customer_id, borrower_id, branch_id]
        );
        ok(res, { loan_id: result.insertId, message: 'Loan issued' });
    } catch(e) { fail(res, 'Failed to issue loan', e); }
});

app.post('/api/loans/:id/payments', async (req, res) => {
    const { payment_amount, payment_method, payment_date, remarks } = req.body;
    if (!payment_amount) return fail(res, 'payment_amount required');
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[loan]] = await conn.execute(
            `SELECT remaining_amount FROM Loan WHERE loan_id=? FOR UPDATE`, [req.params.id]
        );
        if (!loan) throw new Error('Loan not found');
        if (payment_amount > loan.remaining_amount) throw new Error('Payment exceeds remaining amount');
        const newRemaining = parseFloat(loan.remaining_amount) - parseFloat(payment_amount);
        await conn.execute(
            `UPDATE Loan SET remaining_amount=?, status=IF(?<=0,'Closed','Active') WHERE loan_id=?`,
            [newRemaining, newRemaining, req.params.id]
        );
        const [res2] = await conn.execute(
            `INSERT INTO LoanPayment (loan_id,payment_amount,payment_date,payment_method,remarks)
             VALUES (?,?,?,?,?)`,
            [req.params.id, payment_amount, payment_date||new Date().toISOString().slice(0,10),
             payment_method||'Cash', remarks||null]
        );
        await conn.commit();
        ok(res, { loan_payment_id: res2.insertId, new_remaining: newRemaining, message: 'Payment recorded' });
    } catch(e) {
        await conn.rollback();
        fail(res, e.message || 'Payment failed', e);
    } finally { conn.release(); }
});

// ============================================================
//  CREDIT CARDS
// ============================================================
app.get('/api/creditcards', async (req, res) => {
    try {
        const rows = await query(`
            SELECT cc.*, c.name AS customer_name, b.branch_name,
                   ROUND((cc.used_amount/cc.card_limit)*100,2) AS utilisation_pct,
                   CASE
                       WHEN cc.expiry_date < CURDATE() THEN 'Expired'
                       WHEN DATEDIFF(cc.expiry_date,CURDATE()) < 90 THEN 'Expiring Soon'
                       ELSE 'Active'
                   END AS card_status
            FROM CreditCard cc
            JOIN Customer c ON cc.customer_id = c.customer_id
            JOIN Branch   b ON cc.branch_id   = b.branch_id
            ORDER BY utilisation_pct DESC`);
        ok(res, rows);
    } catch(e) { fail(res, 'Credit cards fetch failed', e); }
});

app.post('/api/creditcards', async (req, res) => {
    const { card_number, expiry_date, card_limit, card_type, customer_id, branch_id } = req.body;
    if (!card_number || !customer_id || !card_limit) return fail(res, 'Required fields missing');
    try {
        const result = await query(`
            INSERT INTO CreditCard (card_number,expiry_date,card_limit,card_type,customer_id,branch_id,issued_date)
            VALUES (?,?,?,?,?,?,CURDATE())`,
            [card_number, expiry_date, card_limit, card_type||'Visa', customer_id, branch_id]
        );
        ok(res, { credit_card_id: result.insertId, message: 'Credit card issued' });
    } catch(e) { fail(res, 'Failed to issue card', e); }
});

// ============================================================
//  REPORTS
// ============================================================
app.get('/api/reports/branch-summary', async (req, res) => {
    try {
        const rows = await query(`
            SELECT br.branch_name, br.assets,
                   COUNT(DISTINCT a.account_id)  AS accounts,
                   COALESCE(SUM(a.balance),0)    AS deposits,
                   COUNT(DISTINCT cu.customer_id) AS customers,
                   COUNT(DISTINCT bk.banker_id)  AS bankers,
                   COUNT(DISTINCT l.loan_id)     AS active_loans,
                   COALESCE(SUM(l.remaining_amount),0) AS outstanding_loans
            FROM Branch br
            LEFT JOIN Account  a  ON br.branch_id=a.branch_id
            LEFT JOIN Customer cu ON br.branch_id=cu.branch_id
            LEFT JOIN Banker   bk ON br.branch_id=bk.branch_id
            LEFT JOIN Loan     l  ON br.branch_id=l.branch_id AND l.status='Active'
            GROUP BY br.branch_id, br.branch_name, br.assets
            ORDER BY deposits DESC`);
        ok(res, rows);
    } catch(e) { fail(res, 'Report failed', e); }
});

app.get('/api/reports/monthly-txn', async (req, res) => {
    try {
        const rows = await query(`
            SELECT DATE_FORMAT(transaction_date,'%Y-%m') AS month,
                   SUM(CASE WHEN transaction_type='Credit' THEN amount ELSE 0 END) AS credits,
                   SUM(CASE WHEN transaction_type='Debit'  THEN amount ELSE 0 END) AS debits,
                   COUNT(*) AS count
            FROM Transaction
            GROUP BY month ORDER BY month`);
        ok(res, rows);
    } catch(e) { fail(res, 'Report failed', e); }
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  NexaBank API running at http://localhost:${PORT}`);
    console.log(`  Frontend:  http://localhost:${PORT}`);
    console.log(`  API docs:  GET /api/dashboard | /api/customers | /api/accounts`);
    console.log(`             /api/transactions | /api/loans | /api/creditcards\n`);
    open(`http://localhost:${PORT}`);
});
