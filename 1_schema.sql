-- ============================================================
--   BANK ACCOUNT MANAGEMENT SYSTEM — MySQL Schema + Data
--   File: schema.sql
--   Run in MySQL Workbench or any MySQL 8+ client
-- ============================================================

DROP DATABASE IF EXISTS NexaBank;
CREATE DATABASE NexaBank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE NexaBank;

-- ─────────────────────────────────────────
-- TABLE: Branch
-- ─────────────────────────────────────────
CREATE TABLE Branch (
    branch_id    INT AUTO_INCREMENT PRIMARY KEY,
    branch_name  VARCHAR(100) NOT NULL UNIQUE,
    address      VARCHAR(255) NOT NULL,
    name         VARCHAR(100) NOT NULL,      -- Manager name
    assets       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- TABLE: Banker
-- ─────────────────────────────────────────
CREATE TABLE Banker (
    banker_id   INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    branch_id   INT NOT NULL,
    role        VARCHAR(60) DEFAULT 'Loan Officer',
    email       VARCHAR(120),
    joined_date DATE,
    CONSTRAINT fk_banker_branch FOREIGN KEY (branch_id) REFERENCES Branch(branch_id)
);

-- ─────────────────────────────────────────
-- TABLE: Customer
-- ─────────────────────────────────────────
CREATE TABLE Customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    dob         DATE NOT NULL,
    mobile_no   VARCHAR(15) NOT NULL UNIQUE,
    email       VARCHAR(120),
    address     VARCHAR(255),
    branch_id   INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_branch FOREIGN KEY (branch_id) REFERENCES Branch(branch_id)
);

-- ─────────────────────────────────────────
-- TABLE: Account
-- ─────────────────────────────────────────
CREATE TABLE Account (
    account_id  INT AUTO_INCREMENT PRIMARY KEY,
    balance     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    type        ENUM('Savings','Current','Fixed Deposit','Recurring Deposit') NOT NULL,
    customer_id INT NOT NULL,
    branch_id   INT NOT NULL,
    opened_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status      ENUM('Active','Frozen','Closed') DEFAULT 'Active',
    CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),
    CONSTRAINT fk_account_branch   FOREIGN KEY (branch_id)   REFERENCES Branch(branch_id)
);

-- ─────────────────────────────────────────
-- TABLE: Transaction
-- ─────────────────────────────────────────
CREATE TABLE Transaction (
    transaction_id   INT AUTO_INCREMENT PRIMARY KEY,
    account_id       INT NOT NULL,
    amount           DECIMAL(15,2) NOT NULL,
    transaction_type ENUM('Credit','Debit') NOT NULL,
    description      VARCHAR(255),
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_account FOREIGN KEY (account_id) REFERENCES Account(account_id)
);

-- ─────────────────────────────────────────
-- TABLE: Loan
-- ─────────────────────────────────────────
CREATE TABLE Loan (
    loan_id          INT AUTO_INCREMENT PRIMARY KEY,
    amount           DECIMAL(15,2) NOT NULL,
    issued_amount    DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    loan_type        ENUM('Home','Personal','Vehicle','Education','Business') NOT NULL,
    interest_rate    DECIMAL(5,2) NOT NULL,
    issue_date       DATE NOT NULL,
    due_date         DATE NOT NULL,
    customer_id      INT NOT NULL,
    borrower_id      INT NOT NULL,     -- Banker who approved
    branch_id        INT NOT NULL,
    status           ENUM('Active','Closed','Defaulted') DEFAULT 'Active',
    CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),
    CONSTRAINT fk_loan_banker   FOREIGN KEY (borrower_id) REFERENCES Banker(banker_id),
    CONSTRAINT fk_loan_branch   FOREIGN KEY (branch_id)   REFERENCES Branch(branch_id)
);

-- ─────────────────────────────────────────
-- TABLE: LoanPayment
-- ─────────────────────────────────────────
CREATE TABLE LoanPayment (
    loan_payment_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id         INT NOT NULL,
    payment_amount  DECIMAL(15,2) NOT NULL,
    payment_date    DATE NOT NULL,
    payment_method  ENUM('Auto Debit','Online Transfer','Cash','Cheque','UPI') NOT NULL,
    remarks         VARCHAR(200),
    CONSTRAINT fk_lp_loan FOREIGN KEY (loan_id) REFERENCES Loan(loan_id)
);

-- ─────────────────────────────────────────
-- TABLE: CreditCard
-- ─────────────────────────────────────────
CREATE TABLE CreditCard (
    credit_card_id INT AUTO_INCREMENT PRIMARY KEY,
    card_number    VARCHAR(20) NOT NULL UNIQUE,
    expiry_date    DATE NOT NULL,
    card_limit     DECIMAL(12,2) NOT NULL,
    used_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    card_type      ENUM('Visa','MasterCard','RuPay','Amex') NOT NULL,
    customer_id    INT NOT NULL,
    branch_id      INT NOT NULL,
    issued_date    DATE NOT NULL,
    status         ENUM('Active','Blocked','Expired') DEFAULT 'Active',
    CONSTRAINT fk_cc_customer FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),
    CONSTRAINT fk_cc_branch   FOREIGN KEY (branch_id)   REFERENCES Branch(branch_id)
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Branches
INSERT INTO Branch (branch_name, address, name, assets) VALUES
('MG Road Branch',        '12, MG Road, Bengaluru 560001',          'Rajesh Kumar',  85000000.00),
('Koramangala Branch',    '45, 80ft Road, Koramangala, Bengaluru',  'Sunita Sharma', 72000000.00),
('Whitefield Branch',     '7, ITPL Main Road, Whitefield, Bengaluru','Anil Mehta',   95000000.00),
('Indiranagar Branch',    '100ft Road, Indiranagar, Bengaluru',     'Priya Nair',    60000000.00),
('Electronic City Branch','Phase 1, Electronic City, Bengaluru',    'Vikram Singh',  78000000.00);

-- Bankers
INSERT INTO Banker (name, branch_id, role, email, joined_date) VALUES
('Arjun Patel',    1, 'Loan Officer',           'arjun@nexabank.in',    '2019-03-01'),
('Meena Rao',      1, 'Relationship Manager',   'meena@nexabank.in',    '2018-06-15'),
('Suresh Pillai',  2, 'Loan Officer',           'suresh@nexabank.in',   '2020-01-10'),
('Kavitha Nair',   2, 'Senior Banker',          'kavitha@nexabank.in',  '2017-09-20'),
('Deepak Verma',   3, 'Branch Manager',         'deepak@nexabank.in',   '2016-04-05'),
('Ananya Singh',   3, 'Teller',                 'ananya@nexabank.in',   '2022-07-01'),
('Ravi Shankar',   4, 'Loan Officer',           'ravi@nexabank.in',     '2021-02-14'),
('Pooja Desai',    5, 'Relationship Manager',   'pooja@nexabank.in',    '2019-11-30'),
('Kiran Kumar',    5, 'Loan Officer',           'kiran@nexabank.in',    '2020-08-22'),
('Lakshmi Iyer',   4, 'Senior Banker',          'lakshmi@nexabank.in',  '2018-03-17');

-- Customers
INSERT INTO Customer (name, dob, mobile_no, email, address, branch_id) VALUES
('Aarav Sharma',    '1990-05-12', '9876543210', 'aarav@email.com',   '14 Park Ave, Bengaluru',      1),
('Priya Menon',     '1985-11-23', '9876543211', 'priya@email.com',   '22 Rose Garden, Bengaluru',   1),
('Rohit Gupta',     '1992-03-08', '9876543212', 'rohit@email.com',   '5 Olive Street, Bengaluru',   2),
('Sneha Patil',     '1988-07-19', '9876543213', 'sneha@email.com',   '9 Elm Road, Bengaluru',       2),
('Vivek Reddy',     '1995-01-30', '9876543214', 'vivek@email.com',   '3 Tech Park, Whitefield',     3),
('Anjali Krishnan', '1993-09-14', '9876543215', 'anjali@email.com',  '7 Garden City, Bengaluru',    3),
('Manoj Tiwari',    '1980-12-01', '9876543216', 'manoj@email.com',   '11 Brigade Rd, Bengaluru',    4),
('Divya Bhat',      '1997-06-25', '9876543217', 'divya@email.com',   '30 HSR Layout, Bengaluru',    4),
('Suresh Kamath',   '1975-04-17', '9876543218', 'suresh@email.com',  '6 EC Phase 1, Bengaluru',     5),
('Nisha Joshi',     '1991-08-09', '9876543219', 'nisha@email.com',   '18 Sarjapur Rd, Bengaluru',   5);

-- Accounts
INSERT INTO Account (balance, type, customer_id, branch_id, opened_date) VALUES
(150000.00, 'Savings',           1, 1, '2018-03-15'),
(500000.00, 'Current',           1, 1, '2020-06-01'),
(85000.00,  'Savings',           2, 1, '2019-01-20'),
(200000.00, 'Fixed Deposit',     3, 2, '2021-04-10'),
(30000.00,  'Savings',           4, 2, '2017-08-05'),
(620000.00, 'Current',           5, 3, '2022-02-14'),
(45000.00,  'Recurring Deposit', 6, 3, '2023-01-01'),
(300000.00, 'Savings',           7, 4, '2016-11-30'),
(175000.00, 'Savings',           8, 4, '2020-09-18'),
(90000.00,  'Current',           9, 5, '2019-05-22'),
(410000.00, 'Fixed Deposit',    10, 5, '2021-12-15'),
(55000.00,  'Savings',           2, 1, '2022-07-07');

-- Transactions
INSERT INTO Transaction (account_id, amount, transaction_type, description, transaction_date) VALUES
(1, 20000.00,  'Credit', 'Salary Credit',       '2024-01-05 10:15:00'),
(1,  5000.00,  'Debit',  'ATM Withdrawal',       '2024-01-10 14:30:00'),
(1, 10000.00,  'Debit',  'Online Shopping',      '2024-01-15 09:00:00'),
(2,100000.00,  'Credit', 'Business Income',      '2024-01-08 11:00:00'),
(2, 50000.00,  'Debit',  'Supplier Payment',     '2024-01-20 16:45:00'),
(3, 15000.00,  'Credit', 'Interest Credit',      '2024-02-01 08:30:00'),
(3,  3000.00,  'Debit',  'Utility Bill',         '2024-02-05 12:00:00'),
(5,  8000.00,  'Credit', 'Freelance Payment',    '2024-02-10 13:15:00'),
(5,  2000.00,  'Debit',  'Grocery Shopping',     '2024-02-12 15:30:00'),
(6,200000.00,  'Credit', 'Project Payment',      '2024-03-01 09:45:00'),
(6, 75000.00,  'Debit',  'Office Rent',          '2024-03-05 17:00:00'),
(8, 25000.00,  'Debit',  'EMI Payment',          '2024-03-10 10:00:00'),
(9, 12000.00,  'Credit', 'Salary Credit',        '2024-03-15 14:00:00'),
(10,30000.00,  'Debit',  'Business Expense',     '2024-03-20 11:30:00'),
(1,  5000.00,  'Credit', 'Refund',               '2024-04-01 09:00:00'),
(11,18000.00,  'Credit', 'FD Interest',          '2024-04-05 10:30:00'),
(7,  4500.00,  'Credit', 'RD Installment',       '2024-04-08 09:15:00'),
(4,  7500.00,  'Debit',  'Insurance Premium',    '2024-04-10 14:00:00');

-- Loans
INSERT INTO Loan (amount, issued_amount, remaining_amount, loan_type, interest_rate, issue_date, due_date, customer_id, borrower_id, branch_id) VALUES
(500000.00, 500000.00, 320000.00, 'Home',       8.50, '2021-06-01', '2036-06-01', 1, 1, 1),
(150000.00, 150000.00,  85000.00, 'Personal',  12.00, '2022-01-15', '2025-01-15', 2, 2, 1),
(800000.00, 800000.00, 750000.00, 'Vehicle',    9.00, '2023-03-10', '2028-03-10', 3, 3, 2),
(300000.00, 300000.00, 210000.00, 'Education',  7.50, '2020-08-01', '2030-08-01', 4, 4, 2),
(1000000.00,950000.00, 900000.00, 'Business',  11.00, '2023-07-20', '2028-07-20', 5, 5, 3),
(200000.00, 200000.00,  50000.00, 'Personal',  13.00, '2021-02-01', '2024-02-01', 7, 7, 4),
(600000.00, 600000.00, 420000.00, 'Home',       8.75, '2022-05-15', '2037-05-15', 9, 9, 5);

-- Loan Payments
INSERT INTO LoanPayment (loan_id, payment_amount, payment_date, payment_method) VALUES
(1, 15000.00, '2024-01-01', 'Auto Debit'),
(1, 15000.00, '2024-02-01', 'Auto Debit'),
(1, 15000.00, '2024-03-01', 'Auto Debit'),
(2,  8000.00, '2024-01-10', 'Online Transfer'),
(2,  8000.00, '2024-02-10', 'Online Transfer'),
(3, 18000.00, '2024-01-15', 'Auto Debit'),
(3, 18000.00, '2024-02-15', 'Auto Debit'),
(4,  5000.00, '2024-01-20', 'Cash'),
(4,  5000.00, '2024-02-20', 'Cash'),
(5, 25000.00, '2024-01-05', 'Online Transfer'),
(6, 12000.00, '2024-01-01', 'Cheque'),
(6, 12000.00, '2024-02-01', 'Cheque'),
(7, 20000.00, '2024-01-10', 'Auto Debit'),
(7, 20000.00, '2024-02-10', 'Auto Debit');

-- Credit Cards
INSERT INTO CreditCard (card_number, expiry_date, card_limit, used_amount, card_type, customer_id, branch_id, issued_date) VALUES
('4111111111111111', '2026-12-31', 200000.00,  45000.00, 'Visa',       1, 1, '2022-01-10'),
('5500005555555559', '2025-06-30', 150000.00,  80000.00, 'MasterCard', 2, 1, '2021-06-15'),
('4012888888881881', '2027-03-31', 300000.00, 120000.00, 'Visa',       3, 2, '2023-03-01'),
('6011111111111117', '2026-09-30', 100000.00,  30000.00, 'RuPay',      5, 3, '2022-09-20'),
('378282246310005',  '2025-11-30', 500000.00, 200000.00, 'Amex',       7, 4, '2020-11-05'),
('4111222233334444', '2027-08-31', 250000.00,  95000.00, 'Visa',       9, 5, '2023-08-01');


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW vw_customer_summary AS
SELECT
    c.customer_id,
    c.name                                          AS customer_name,
    c.mobile_no,
    b.branch_name,
    COUNT(DISTINCT a.account_id)                    AS total_accounts,
    COALESCE(SUM(a.balance), 0)                     AS total_balance,
    COUNT(DISTINCT l.loan_id)                       AS active_loans,
    COUNT(DISTINCT cc.credit_card_id)               AS credit_cards
FROM Customer c
LEFT JOIN Branch     b  ON c.branch_id   = b.branch_id
LEFT JOIN Account    a  ON c.customer_id = a.customer_id
LEFT JOIN Loan       l  ON c.customer_id = l.customer_id AND l.status = 'Active'
LEFT JOIN CreditCard cc ON c.customer_id = cc.customer_id
GROUP BY c.customer_id, c.name, c.mobile_no, b.branch_name;

CREATE OR REPLACE VIEW vw_loan_status AS
SELECT
    l.loan_id,
    c.name                                               AS customer_name,
    l.loan_type,
    l.amount,
    l.issued_amount,
    l.remaining_amount,
    ROUND((l.remaining_amount / l.amount) * 100, 2)     AS pct_remaining,
    l.interest_rate,
    l.issue_date,
    l.due_date,
    CASE WHEN l.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'Active' END AS loan_status,
    bk.name                                              AS approved_by,
    br.branch_name
FROM Loan l
JOIN Customer c  ON l.customer_id = c.customer_id
JOIN Banker   bk ON l.borrower_id = bk.banker_id
JOIN Branch   br ON l.branch_id   = br.branch_id;

-- ============================================================
-- USEFUL QUERIES FOR REPORT / TESTING
-- ============================================================

-- Q1: Check balance for a customer
SELECT c.name, a.account_id, a.type, a.balance, b.branch_name
FROM Customer c
JOIN Account a ON c.customer_id = a.customer_id
JOIN Branch  b ON a.branch_id   = b.branch_id
WHERE c.customer_id = 1;

-- Q2: Transaction history for account
SELECT t.transaction_id, t.transaction_date, t.transaction_type, t.amount, t.description
FROM Transaction t WHERE t.account_id = 1
ORDER BY t.transaction_date DESC;

-- Q3: Loan repayment status
SELECT * FROM vw_loan_status ORDER BY pct_remaining DESC;

-- Q4: Monthly credit/debit summary
SELECT
    DATE_FORMAT(transaction_date,'%Y-%m') AS month,
    SUM(CASE WHEN transaction_type='Credit' THEN amount ELSE 0 END) AS total_credit,
    SUM(CASE WHEN transaction_type='Debit'  THEN amount ELSE 0 END) AS total_debit,
    COUNT(*) AS txn_count
FROM Transaction GROUP BY month ORDER BY month;

-- Q5: Top customers by total balance
SELECT customer_name, total_accounts, total_balance, active_loans
FROM vw_customer_summary ORDER BY total_balance DESC LIMIT 5;

-- Q6: Credit card utilisation
SELECT cc.credit_card_id, c.name, cc.card_type, cc.card_limit, cc.used_amount,
       ROUND((cc.used_amount/cc.card_limit)*100,2) AS utilisation_pct
FROM CreditCard cc JOIN Customer c ON cc.customer_id=c.customer_id
ORDER BY utilisation_pct DESC;

-- Q7: Branch-wise deposit summary
SELECT br.branch_name, COUNT(a.account_id) AS accounts,
       SUM(a.balance) AS total_deposits, COUNT(DISTINCT c.customer_id) AS customers
FROM Branch br
LEFT JOIN Account  a ON br.branch_id=a.branch_id
LEFT JOIN Customer c ON br.branch_id=c.branch_id
GROUP BY br.branch_id, br.branch_name;

-- Q8: Overdue loans
SELECT loan_id, customer_name, loan_type, remaining_amount, due_date,
       DATEDIFF(CURRENT_DATE, due_date) AS days_overdue
FROM vw_loan_status WHERE loan_status='OVERDUE';

-- Q9: Loan payment history with running total
SELECT lp.loan_payment_id, lp.payment_date, lp.payment_amount, lp.payment_method,
       SUM(lp.payment_amount) OVER (PARTITION BY lp.loan_id ORDER BY lp.payment_date) AS cumulative_paid
FROM LoanPayment lp ORDER BY lp.loan_id, lp.payment_date;

-- Q10: Banker performance
SELECT bk.name AS banker, br.branch_name, bk.role,
       COUNT(l.loan_id) AS loans_approved,
       COALESCE(SUM(l.issued_amount),0) AS total_disbursed
FROM Banker bk
LEFT JOIN Loan   l  ON bk.banker_id = l.borrower_id
JOIN      Branch br ON bk.branch_id = br.branch_id
GROUP BY bk.banker_id, bk.name, br.branch_name, bk.role
ORDER BY loans_approved DESC;
