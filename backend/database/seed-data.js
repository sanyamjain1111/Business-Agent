const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');

// Database connection config
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Jain@2514',
  database: 'ecommerce_analytics'
};

// Connect to database
async function seedDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database successfully");

    // Seed categories
    await seedCategories(connection);
    
    // Seed suppliers
    await seedSuppliers(connection);
    
    // Seed products
    await seedProducts(connection);
    
    // Seed customers
    await seedCustomers(connection);
    
    // Seed warehouses
    await seedWarehouses(connection);
    
    // Seed inventory
    await seedInventory(connection);
    
    // Seed customer segments
    await seedCustomerSegments(connection);
    
    // Seed marketing campaigns
    await seedMarketingCampaigns(connection);
    
    // Seed campaign performance
    await seedCampaignPerformance(connection);
    
    // Seed orders and order details
    await seedOrdersAndDetails(connection);
    
    // Seed returns
    await seedReturns(connection);
    
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

// Seed categories with error handling
async function seedCategories(connection) {
  console.log("Seeding categories...");
  
  const mainCategories = [
    { id: 1, name: 'Electronics', parent: null, dept: 'Tech' },
    { id: 2, name: 'Clothing', parent: null, dept: 'Apparel' },
    { id: 3, name: 'Home & Kitchen', parent: null, dept: 'Home Goods' },
    { id: 4, name: 'Books', parent: null, dept: 'Media' }
  ];
  
  const subCategories = [
    { id: 5, name: 'Smartphones', parent: 1, dept: 'Tech' },
    { id: 6, name: 'Laptops', parent: 1, dept: 'Tech' },
    { id: 7, name: 'Audio', parent: 1, dept: 'Tech' },
    { id: 8, name: 'Men\'s Clothing', parent: 2, dept: 'Apparel' },
    { id: 9, name: 'Women\'s Clothing', parent: 2, dept: 'Apparel' },
    { id: 10, name: 'Kitchen Appliances', parent: 3, dept: 'Home Goods' },
    { id: 11, name: 'Furniture', parent: 3, dept: 'Home Goods' },
    { id: 12, name: 'Fiction', parent: 4, dept: 'Media' },
    { id: 13, name: 'Non-Fiction', parent: 4, dept: 'Media' }
  ];
  
  for (const category of [...mainCategories, ...subCategories]) {
    try {
      await connection.execute(
        'INSERT INTO categories (cat_id, cat_name, parent_category_id, dept) VALUES (?, ?, ?, ?)',
        [category.id, category.name, category.parent, category.dept]
      );
    } catch (error) {
      console.error(`Error inserting category ${category.id}:`, error.message);
    }
  }
}

// Seed suppliers with error handling
async function seedSuppliers(connection) {
  console.log("Seeding suppliers...");
  
  for (let i = 1; i <= 20; i++) {
    try {
      await connection.execute(
        'INSERT INTO sup (s_id, s_name, s_contact, s_email, s_addr, s_country, rating, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          i,
          faker.company.name(),
          faker.person.fullName(),
          faker.internet.email(),
          faker.location.streetAddress(),
          faker.location.country(),
          faker.number.float({ min: 1, max: 5, precision: 0.1 }),
          Math.random() > 0.1 // 90% active
        ]
      );
    } catch (error) {
      console.error(`Error inserting supplier ${i}:`, error.message);
    }
  }
}

// Seed products with error handling
async function seedProducts(connection) {
  console.log("Seeding products...");
  
  const productNames = {
    5: ['iPhone 13', 'Samsung Galaxy S21', 'Google Pixel 6', 'OnePlus 9'],
    6: ['MacBook Pro', 'Dell XPS', 'HP Spectre', 'Lenovo ThinkPad'],
    7: ['Sony Headphones', 'Bose Speakers', 'AirPods Pro', 'JBL Earbuds'],
    8: ['Men\'s T-Shirt', 'Jeans', 'Hoodie', 'Casual Shirt'],
    9: ['Women\'s Dress', 'Blouse', 'Skirt', 'Leggings'],
    10: ['Blender', 'Toaster', 'Coffee Maker', 'Air Fryer'],
    11: ['Sofa', 'Dining Table', 'Bed Frame', 'Office Chair'],
    12: ['Novel', 'Science Fiction', 'Mystery', 'Romance'],
    13: ['Biography', 'Self-Help', 'History', 'Science']
  };
  
  let productId = 1;
  
  for (const [categoryId, products] of Object.entries(productNames)) {
    for (let i = 0; i < products.length; i++) {
      const baseProduct = products[i];
      
      // Create multiple variations of each product
      for (let variant = 1; variant <= 3; variant++) {
        try {
          await connection.execute(
            'INSERT INTO products (prod_id, name, description, base_price, category_id, supplier_id, created_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              productId,
              `${baseProduct} ${variant}`,
              faker.commerce.productDescription(),
              faker.number.float({ min: 9.99, max: 999.99, precision: 0.01 }),
              parseInt(categoryId),
              faker.number.int({ min: 1, max: 20 }), // Random supplier
              faker.date.past({ years: 3 }),
              Math.random() > 0.05 // 95% active
            ]
          );
          productId++;
        } catch (error) {
          console.error(`Error inserting product ${productId}:`, error.message);
          productId++; // Still increment to maintain unique IDs
        }
      }
    }
  }
}

// Seed customers with error handling and improved phone format
async function seedCustomers(connection) {
  console.log("Seeding customers...");
  
  const segments = ['High Value', 'Mid Value', 'Low Value', 'New', 'Churned'];
  
  for (let i = 1; i <= 500; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const creationDate = faker.date.past({ years: 5 });
    const segment = segments[Math.floor(Math.random() * segments.length)];
    
    let ltv;
    switch (segment) {
      case 'High Value':
        ltv = faker.number.float({ min: 1000, max: 5000, precision: 0.01 });
        break;
      case 'Mid Value':
        ltv = faker.number.float({ min: 500, max: 999.99, precision: 0.01 });
        break;
      case 'Low Value':
        ltv = faker.number.float({ min: 100, max: 499.99, precision: 0.01 });
        break;
      case 'New':
        ltv = faker.number.float({ min: 0, max: 99.99, precision: 0.01 });
        break;
      case 'Churned':
        ltv = faker.number.float({ min: 0, max: 200, precision: 0.01 });
        break;
    }
    
    // Format phone number with dashes to ensure it's treated as a string
    const phoneNumber = `${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(4)}`;
    
    try {
      await connection.execute(
        'INSERT INTO customers (customer_id, first_name, last_name, email, phone, addr, city, state, zip, country, creation_date, last_login, cust_segment, ltv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          i,
          firstName,
          lastName,
          faker.internet.email({ firstName, lastName }),
          phoneNumber,
          faker.location.streetAddress(),
          faker.location.city(),
          faker.location.state(),
          faker.location.zipCode('#####'),
          faker.location.country(),
          creationDate,
          faker.date.between({ from: creationDate, to: new Date() }),
          segment,
          ltv
        ]
      );
    } catch (error) {
      console.error(`Error inserting customer ${i}:`, error.message);
    }
  }
}

// Seed warehouses with error handling
async function seedWarehouses(connection) {
  console.log("Seeding warehouses...");
  
  const warehouses = [
    { id: 1, name: 'East Coast Fulfillment Center', city: 'New York', state: 'NY' },
    { id: 2, name: 'West Coast Distribution Hub', city: 'Los Angeles', state: 'CA' },
    { id: 3, name: 'Midwest Logistics Center', city: 'Chicago', state: 'IL' },
    { id: 4, name: 'Southern Warehouse', city: 'Dallas', state: 'TX' },
    { id: 5, name: 'Pacific Northwest Facility', city: 'Seattle', state: 'WA' }
  ];
  
  for (const warehouse of warehouses) {
    try {
      await connection.execute(
        'INSERT INTO warehouses (warehouse_id, warehouse_name, address, city, state, country, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          warehouse.id,
          warehouse.name,
          faker.location.streetAddress(),
          warehouse.city,
          warehouse.state,
          'USA',
          faker.number.int({ min: 1, max: 10 }) // Manager ID
        ]
      );
    } catch (error) {
      console.error(`Error inserting warehouse ${warehouse.id}:`, error.message);
    }
  }
}

// Seed inventory with error handling
async function seedInventory(connection) {
  console.log("Seeding inventory...");
  
  try {
    // Get the total number of products
    const [productRows] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const productCount = productRows[0].count;
    
    // For each product, create inventory records in multiple warehouses
    for (let productId = 1; productId <= productCount; productId++) {
      // Random distribution across warehouses
      const warehouseCount = faker.number.int({ min: 1, max: 5 });
      const warehouses = new Set();
      
      for (let i = 0; i < warehouseCount; i++) {
        warehouses.add(faker.number.int({ min: 1, max: 5 }));
      }
      
      // Create inventory record for each warehouse
      let invId = (productId - 1) * 5 + 1;
      for (const warehouseId of warehouses) {
        const quantity = faker.number.int({ min: 0, max: 500 });
        
        try {
          await connection.execute(
            'INSERT INTO inventory (inv_id, p_id, wh_id, qty, min_level, max_level, reorder_level, last_restock_date, last_count_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              invId++,
              productId,
              warehouseId,
              quantity,
              faker.number.int({ min: 10, max: 50 }),
              faker.number.int({ min: 300, max: 600 }),
              faker.number.int({ min: 20, max: 100 }),
              faker.date.recent(60),
              faker.date.recent(30)
            ]
          );
        } catch (error) {
          console.error(`Error inserting inventory ${invId - 1} for product ${productId} in warehouse ${warehouseId}:`, error.message);
          invId++; // Still increment to maintain unique IDs
        }
      }
    }
  } catch (error) {
    console.error("Error in inventory seeding process:", error);
  }
}

// Seed customer segments with error handling
async function seedCustomerSegments(connection) {
  console.log("Seeding customer segments...");
  
  const segments = [
    { id: 1, name: 'High Value', description: 'Customers with high lifetime value' },
    { id: 2, name: 'Mid Value', description: 'Customers with medium lifetime value' },
    { id: 3, name: 'Low Value', description: 'Customers with low lifetime value' },
    { id: 4, name: 'New', description: 'Recently acquired customers' },
    { id: 5, name: 'Churned', description: 'Customers who haven\'t purchased in 6+ months' }
  ];
  
  for (const segment of segments) {
    try {
      await connection.execute(
        'INSERT INTO CUSTOMER_SEGMENTS (SEGMENT_ID, SEGMENT_NAME, SEGMENT_DESCRIPTION, CREATION_DATE, LAST_UPDATED, CREATED_BY) VALUES (?, ?, ?, ?, ?, ?)',
        [
          segment.id,
          segment.name,
          segment.description,
          faker.date.past({ years: 2 }),
          faker.date.recent(90),
          faker.person.fullName()
        ]
      );
    } catch (error) {
      console.error(`Error inserting customer segment ${segment.id}:`, error.message);
    }
  }
}

// Seed marketing campaigns with error handling
async function seedMarketingCampaigns(connection) {
  console.log("Seeding marketing campaigns...");
  
  const campaignTypes = ['Email', 'Social Media', 'Search', 'Display', 'Influencer', 'TV', 'Radio'];
  const channels = ['Facebook', 'Instagram', 'Google', 'Email', 'TV', 'Radio', 'YouTube', 'TikTok'];
  const segments = ['High Value', 'Mid Value', 'Low Value', 'New', 'Churned', 'All'];
  
  for (let i = 1; i <= 20; i++) {
    const startDate = faker.date.past({ years: 1 });
    const endDate = faker.date.future({ years: 1, refDate: startDate });
    
    try {
      await connection.execute(
        'INSERT INTO mktg_cmp (campaign_id, name, type, start_dt, end_dt, budget, target_segment, channel, ROI) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          i,
          `Campaign ${i}: ${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
          campaignTypes[Math.floor(Math.random() * campaignTypes.length)],
          startDate,
          endDate,
          faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
          segments[Math.floor(Math.random() * segments.length)],
          channels[Math.floor(Math.random() * channels.length)],
          faker.number.float({ min: -0.5, max: 3, precision: 0.01 }) // ROI can be negative
        ]
      );
    } catch (error) {
      console.error(`Error inserting marketing campaign ${i}:`, error.message);
    }
  }
}

// Seed campaign performance with error handling
async function seedCampaignPerformance(connection) {
  console.log("Seeding campaign performance...");
  
  try {
    // Get campaign info
    const [campaigns] = await connection.execute('SELECT campaign_id, start_dt, end_dt FROM mktg_cmp');
    
    let performanceId = 1;
    
    for (const campaign of campaigns) {
      const start = new Date(campaign.start_dt);
      const end = new Date(campaign.end_dt);
      let currentDate = new Date(start);
      
      // Generate daily performance data for each campaign
      while (currentDate <= end && currentDate <= new Date()) {
        const impressions = faker.number.int({ min: 1000, max: 50000 });
        const clickRate = faker.number.float({ min: 0.01, max: 0.1, precision: 0.001 });
        const clicks = Math.floor(impressions * clickRate);
        const conversionRate = faker.number.float({ min: 0.001, max: 0.05, precision: 0.001 });
        const conversions = Math.floor(clicks * conversionRate);
        const revenue = conversions * faker.number.float({ min: 20, max: 200, precision: 0.01 });
        const cost = faker.number.float({ min: 100, max: 1000, precision: 0.01 });
        
        try {
          await connection.execute(
            'INSERT INTO c_p (id, c_id, dt, imp, clk, cnv, rev, cst) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              performanceId++,
              campaign.campaign_id,
              currentDate,
              impressions,
              clicks,
              conversions,
              revenue,
              cost
            ]
          );
        } catch (error) {
          console.error(`Error inserting campaign performance ${performanceId - 1} for campaign ${campaign.campaign_id}:`, error.message);
          performanceId++; // Still increment to maintain unique IDs
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } catch (error) {
    console.error("Error in campaign performance seeding process:", error);
  }
}

// Seed orders and order details with error handling
async function seedOrdersAndDetails(connection) {
  console.log("Seeding orders and order details...");
  
  const statuses = ['Completed', 'Processing', 'Shipped', 'Cancelled', 'Returned'];
  const channels = ['Website', 'Mobile App', 'Phone', 'In-Store', 'Marketplace'];
  const paymentMethods = ['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay', 'Gift Card', 'Cash'];
  const deliveryMethods = ['Standard', 'Express', 'Next Day', 'Store Pickup', 'Locker'];
  
  try {
    // Get product info
    const [products] = await connection.execute('SELECT prod_id, base_price FROM products');
    
    let orderId = 1;
    let orderDetailId = 1;
    
    // For each customer, generate orders
    for (let customerId = 1; customerId <= 500; customerId++) {
      try {
        // Number of orders per customer based on segment
        const [customerSegment] = await connection.execute(
          'SELECT cust_segment FROM customers WHERE customer_id = ?',
          [customerId]
        );
        
        // Skip if customer doesn't exist
        if (!customerSegment || customerSegment.length === 0) {
          console.log(`Skipping orders for non-existent customer ${customerId}`);
          continue;
        }
        
        let orderCount;
        switch (customerSegment[0].cust_segment) {
          case 'High Value':
            orderCount = faker.number.int({ min: 5, max: 20 });
            break;
          case 'Mid Value':
            orderCount = faker.number.int({ min: 3, max: 10 });
            break;
          case 'Low Value':
            orderCount = faker.number.int({ min: 1, max: 5 });
            break;
          case 'New':
            orderCount = faker.number.int({ min: 1, max: 2 });
            break;
          case 'Churned':
            orderCount = faker.number.int({ min: 0, max: 3 });
            break;
          default:
            orderCount = faker.number.int({ min: 1, max: 5 });
        }
        
        for (let i = 0; i < orderCount; i++) {
          const orderDate = faker.date.past({ years: 2 });
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const channel = channels[Math.floor(Math.random() * channels.length)];
          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const deliveryMethod = deliveryMethods[Math.floor(Math.random() * deliveryMethods.length)];
          
          // Generate order items
          const itemCount = faker.number.int({ min: 1, max: 5 });
          const orderItems = [];
          let orderTotal = 0;
          
          for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = faker.number.int({ min: 1, max: 5 });
            const unitPrice = product.base_price;
            const discount = Math.random() < 0.3 ? unitPrice * faker.number.float({ min: 0.05, max: 0.3, precision: 0.01 }) : 0;
            const itemTotal = (unitPrice - discount) * quantity;
            
            orderItems.push({
              product_id: product.prod_id,
              quantity: quantity,
              unit_price: unitPrice,
              discount: discount,
              total: itemTotal
            });
            
            orderTotal += itemTotal;
          }
          
          // Calculate order totals
          const tax = orderTotal * 0.08;
          const shipping = (deliveryMethod === 'Standard' || deliveryMethod === 'Store Pickup') ? 0 : faker.number.float({ min: 5, max: 20, precision: 0.01 });
          const orderAmount = orderTotal + tax + shipping;
          
          try {
            // Insert order
            await connection.execute(
              'INSERT INTO orders (oid, cid, odate, s, a, tx, sh, ch, pm, dm, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                orderId,
                customerId,
                orderDate,
                status,
                orderAmount,
                tax,
                shipping,
                channel,
                paymentMethod,
                deliveryMethod,
                ''
              ]
            );
            
            // Insert order details
            for (const item of orderItems) {
              try {
                await connection.execute(
                  'INSERT INTO order_details (od_id, o_id, p_id, q, up, d, t) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [
                    orderDetailId++,
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    item.discount,
                    item.total
                  ]
                );
              } catch (error) {
                console.error(`Error inserting order detail ${orderDetailId - 1} for order ${orderId}:`, error.message);
                orderDetailId++; // Still increment to maintain unique IDs
              }
            }
            
            orderId++;
          } catch (error) {
            console.error(`Error inserting order ${orderId} for customer ${customerId}:`, error.message);
            orderId++; // Still increment to maintain unique IDs
          }
        }
      } catch (error) {
        console.error(`Error processing orders for customer ${customerId}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error in orders seeding process:", error);
  }
}

// Seed returns with error handling
async function seedReturns(connection) {
  console.log("Seeding returns...");
  
  const reasons = ['Defective', 'Wrong Size', 'Didn\'t Like', 'Incorrect Item', 'Other'];
  const conditions = ['New', 'Open Box', 'Damaged', 'Used'];
  
  try {
    // Get completed orders
    const [orders] = await connection.execute(
      'SELECT oid, a FROM orders WHERE s = "Completed" OR s = "Returned"'
    );
    
    let returnId = 1;
    
    for (const order of orders) {
      // ~15% of orders have returns
      if (Math.random() < 0.15) {
        try {
          await connection.execute(
            'INSERT INTO returns_data (r_id, order_id, return_date, reason, condition1, refund_amount, restocked) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              returnId++,
              order.oid,
              faker.date.recent(60),
              reasons[Math.floor(Math.random() * reasons.length)],
              conditions[Math.floor(Math.random() * conditions.length)],
              order.a * faker.number.float({ min: 0.5, max: 1, precision: 0.01 }), // Partial or full refund
              Math.random() > 0.3 // 70% chance of being restocked
            ]
          );
          
          // Update order status if it was returned
          await connection.execute(
            'UPDATE orders SET s = "Returned" WHERE oid = ?',
            [order.oid]
          );
        } catch (error) {
          console.error(`Error inserting return ${returnId - 1} for order ${order.oid}:`, error.message);
          returnId++; // Still increment to maintain unique IDs
        }
      }
    }
  } catch (error) {
    console.error("Error in returns seeding process:", error);
  }
}

// Make the function importable for use in other scripts
module.exports = {
  seedDatabase
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => console.log("Database seed execution completed"))
    .catch(err => console.error("Error executing database seed:", err));
}