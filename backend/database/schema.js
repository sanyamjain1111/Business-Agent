// Node.js script to create the ecommerce_analytics database schema
const mysql = require('mysql2/promise');
require('dotenv').config(); // To load environment variables from .env file

// SQL statements - keeping the original inconsistent naming as required
const sqlStatements = [
  // Create database
  'CREATE DATABASE IF NOT EXISTS ecommerce_analytics;',
  'USE ecommerce_analytics;',
  
  // Products table (decent naming)
  `CREATE TABLE IF NOT EXISTS products (
    prod_id INT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    base_price DECIMAL(10, 2),
    category_id INT,
    supplier_id INT,
    created_date DATETIME,
    is_active BOOLEAN
  );`,
  
  // Categories table (decent naming)
  `CREATE TABLE IF NOT EXISTS categories (
    cat_id INT PRIMARY KEY,
    cat_name VARCHAR(50),
    parent_category_id INT,
    dept VARCHAR(50)
  );`,
  
  // Suppliers (poorly named table)
  `CREATE TABLE IF NOT EXISTS sup (
    s_id INT PRIMARY KEY,
    s_name VARCHAR(100),
    s_contact VARCHAR(100),
    s_email VARCHAR(100),
    s_addr TEXT,
    s_country VARCHAR(50),
    rating DECIMAL(3, 2),
    active BOOLEAN
  );`,
  
  // Customers table (mixed quality naming)
  `CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    addr TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(50),
    creation_date DATETIME,
    last_login DATETIME,
    cust_segment VARCHAR(20),
    ltv DECIMAL(10, 2)
  );`,
  
  // Orders table (poor column naming)
  `CREATE TABLE IF NOT EXISTS orders (
    oid INT PRIMARY KEY,
    cid INT,
    odate DATETIME,
    s VARCHAR(20),
    a DECIMAL(10, 2),
    tx DECIMAL(10, 2),
    sh DECIMAL(10, 2),
    ch VARCHAR(20),
    pm VARCHAR(20),
    dm VARCHAR(20),
    notes TEXT
  );`,
  
  // Order details (unnamed columns)
  `CREATE TABLE IF NOT EXISTS order_details (
    od_id INT PRIMARY KEY,
    o_id INT,
    p_id INT,
    q INT,
    up DECIMAL(10, 2),
    d DECIMAL(10, 2),
    t DECIMAL(10, 2)
  );`,
  
  // Inventory (mix of good and bad naming)
  `CREATE TABLE IF NOT EXISTS inventory (
    inv_id INT PRIMARY KEY,
    p_id INT,
    wh_id INT,
    qty INT,
    min_level INT,
    max_level INT,
    reorder_level INT,
    last_restock_date DATETIME,
    last_count_date DATETIME
  );`,
  
  // Warehouses
  `CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id INT PRIMARY KEY,
    warehouse_name VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50),
    manager_id INT
  );`,
  
  // Marketing campaigns (inconsistent naming)
  `CREATE TABLE IF NOT EXISTS mktg_cmp (
    campaign_id INT PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),
    start_dt DATETIME,
    end_dt DATETIME,
    budget DECIMAL(10, 2),
    target_segment VARCHAR(50),
    channel VARCHAR(50),
    ROI DECIMAL(10, 2)
  );`,
  
  // Campaign performance (really bad naming)
  `CREATE TABLE IF NOT EXISTS c_p (
    id INT PRIMARY KEY,
    c_id INT,
    dt DATE,
    imp INT,
    clk INT,
    cnv INT,
    rev DECIMAL(10, 2),
    cst DECIMAL(10, 2)
  );`,
  
  // Customer segments (different naming style)
  `CREATE TABLE IF NOT EXISTS CUSTOMER_SEGMENTS (
    SEGMENT_ID INT PRIMARY KEY,
    SEGMENT_NAME VARCHAR(50),
    SEGMENT_DESCRIPTION TEXT,
    CREATION_DATE DATETIME,
    LAST_UPDATED DATETIME,
    CREATED_BY VARCHAR(50)
  );`,
  
  // Irregular naming for returns
  `CREATE TABLE IF NOT EXISTS returns_data (
    r_id INT PRIMARY KEY,
    order_id INT,
    return_date DATETIME,
    reason VARCHAR(200),
    condition1 VARCHAR(50),
    refund_amount DECIMAL(10, 2),
    restocked BOOLEAN
  );`,
  
  // Add foreign keys
  'ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES categories(cat_id);',
  'ALTER TABLE products ADD FOREIGN KEY (supplier_id) REFERENCES sup(s_id);',
  'ALTER TABLE orders ADD FOREIGN KEY (cid) REFERENCES customers(customer_id);',
  'ALTER TABLE order_details ADD FOREIGN KEY (o_id) REFERENCES orders(oid);',
  'ALTER TABLE order_details ADD FOREIGN KEY (p_id) REFERENCES products(prod_id);',
  'ALTER TABLE inventory ADD FOREIGN KEY (p_id) REFERENCES products(prod_id);',
  'ALTER TABLE inventory ADD FOREIGN KEY (wh_id) REFERENCES warehouses(warehouse_id);'
];

async function createDatabase() {
  try {
    // First create a connection without database name
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Jain@2514',
      multipleStatements: true // Allow multiple statements
    });
    
    console.log('Connected to MySQL server');

    // Create database and switch to it
    await connection.query('CREATE DATABASE IF NOT EXISTS ecommerce_analytics');
    await connection.query('USE ecommerce_analytics');
    
    console.log('Created and using ecommerce_analytics database');
    
    // Execute each SQL statement sequentially
    for (const sql of sqlStatements) {
      console.log(`Executing: ${sql.substring(0, 50)}...`);
      await connection.query(sql);
    }
    
    console.log('All database schema statements executed successfully');
    await connection.end();
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Run the script
createDatabase();