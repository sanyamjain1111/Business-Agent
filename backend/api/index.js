// api/index.js (Vercel serverless entry point)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Change from mysql2 to pg
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bodyParser = require('body-parser');
require('dotenv').config();

// Initialize Express app
const app = express();

const corsOptions = {
  origin: [
    'https://business-agent-7wtv.vercel.app', // Your frontend URL (without trailing slash)
    'http://localhost:3000', // Local development frontend
    'https://business-agent-mk5g.vercel.app' // Your backend URL (without trailing slash)
  ],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Database connection config for Supabase PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Jain@2514@db.ksxspvjbgnwajmurneyg.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
};

// Create a pool instead of creating connections for each query
const pool = new Pool(dbConfig);

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyD_anS93dWH5rgUa57uMuVfse8_OnJUBcE');

// Cache database schema
let databaseSchema = null;

// Get database schema (PostgreSQL version)
async function getDatabaseSchema() {
  if (databaseSchema) return databaseSchema;
  
  try {
    const client = await pool.connect();
    
    // Get all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const schema = {};
    
    // Get columns for each table
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      // Fixed query: added explicit table aliases to all column references
      const columns = await client.query(`
        SELECT c.column_name, c.data_type, c.is_nullable, 
               CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END as column_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS ku
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND ku.table_name = $1
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_schema = 'public' AND c.table_name = $1
      `, [tableName]);
      
      // Get sample data for each table
      const sampleData = await client.query(`SELECT * FROM "${tableName}" LIMIT 5`);
      
      schema[tableName] = {
        columns: columns.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          key: col.column_key
        })),
        sampleData: sampleData.rows
      };
    }
    
    // Get foreign key relationships with explicit table aliases
    const relations = await client.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema  
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);
    
    // Add relationships to schema
    relations.rows.forEach(relation => {
      const tableName = relation.table_name;
      const columnName = relation.column_name;
      const refTableName = relation.referenced_table_name;
      const refColumnName = relation.referenced_column_name;
      
      if (!schema[tableName].relationships) {
        schema[tableName].relationships = [];
      }
      
      schema[tableName].relationships.push({
        columnName,
        refTableName,
        refColumnName
      });
    });
    
    client.release();
    databaseSchema = schema;
    return schema;
    
  } catch (error) {
    console.error("Error fetching database schema:", error);
    throw error;
  }
}
// Generate SQL from natural language query (updated for PostgreSQL syntax)
async function generateSQL(query) {
  const schema = await getDatabaseSchema();
  
  // Format schema as a string for the prompt
  let schemaDescription = "Database Schema:\n\n";
  
  for (const [tableName, tableInfo] of Object.entries(schema)) {
    schemaDescription += `Table: ${tableName}\n`;
    schemaDescription += "Columns:\n";
    
    tableInfo.columns.forEach(col => {
      schemaDescription += `- ${col.name} (${col.type})${col.key === 'PRI' ? ' PRIMARY KEY' : ''}\n`;
    });
    
    if (tableInfo.relationships && tableInfo.relationships.length > 0) {
      schemaDescription += "Relationships:\n";
      tableInfo.relationships.forEach(rel => {
        schemaDescription += `- ${rel.columnName} references ${rel.refTableName}(${rel.refColumnName})\n`;
      });
    }
    
    schemaDescription += "Sample Data:\n";
    if (tableInfo.sampleData.length > 0) {
      const sampleRow = tableInfo.sampleData[0];
      schemaDescription += `- Example: ${JSON.stringify(sampleRow)}\n`;
    } else {
      schemaDescription += "- No sample data available\n";  
    }
    
    schemaDescription += "\n";
  }

  const columnMappings = {
    // Orders table mappings
    "oid": "Order ID",
    "cid": "Customer ID",
    "odate": "Order Date",
    "s": "Status",
    "a": "Amount",
    "tx": "Tax",
    "sh": "Shipping Cost",
    "ch": "Channel",
    "pm": "Payment Method",
    "dm": "Delivery Method",
    
    // Order details mappings
    "o_id": "Order ID",
    "p_id": "Product ID",
    "q": "Quantity",
    "up": "Unit Price",
    "d": "Discount",
    "t": "Total",
    
    // Campaign performance mappings
    "c_id": "Campaign ID",
    "dt": "Date",
    "imp": "Impressions",
    "clk": "Clicks",
    "cnv": "Conversions", 
    "rev": "Revenue",
    "cst": "Cost",
    
    // Supplier mappings
    "s_id": "Supplier ID",
    "s_name": "Supplier Name",
    "s_contact": "Supplier Contact",
    "s_email": "Supplier Email",
    "s_addr": "Supplier Address",
    "s_country": "Supplier Country"
  };
  
  // Add column mappings to the schema description
  schemaDescription += "Column Name Mappings (for poorly named columns):\n";
  for (const [badName, goodName] of Object.entries(columnMappings)) {
    schemaDescription += `- ${badName}: ${goodName}\n`;
  }
  
  try {
    // Get Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    
    // System prompt combined with user prompt
    const prompt = `You are an AI data analyst expert at converting natural language queries into SQL.

The database has intentionally poor naming in some places and dirty data. You need to interpret the 
human's question, understand the schema, and generate the correct SQL query.

Your task is to:
1. Understand the user's business question
2. Analyze the database schema provided
3. Generate a valid SQL query that answers the question
4. Provide a brief explanation of what the query does
5. Suggest an appropriate visualization type (bar chart, line chart, pie chart, etc.)

The database is an e-commerce analytics database with information about products, orders, customers, 
marketing campaigns, and more. Some column names are abbreviated or unclear, for example 'a' for Amount 
in the orders table.

Always provide a valid SQL query and include all necessary joins. Check that column names and table names 
are correct. Ensure your query makes sense for the business question being asked.

Rules:
- Queries should work with PostgreSQL syntax (not MySQL)
- Use double quotes for table and column names when needed
- Prefer explicit column names over '*'
- Join tables as needed
- Use aliases for readability
- Comment any complex parts of the query
- For time-based queries, use PostgreSQL date functions
- Handle null values appropriately
- For visualization data, limit the result to a reasonable size (e.g., top 10)
- Include appropriate aggregations for business metrics
- Add ORDER BY clauses when relevant
- When returning visualization data, focus on the most insightful dimensions

Important: Make sure your query will actually run on the schema provided.

Here is the database schema:

${schemaDescription}

Please convert this question into SQL: "${query}"

Format your response as follows:
\`\`\`sql
YOUR SQL QUERY HERE
\`\`\`

Explanation:
Brief explanation of what the query does

Visualization:
Suggested visualization type (bar chart, line chart, pie chart, etc.)`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Find SQL block (between triple backticks)
    const sqlMatch = response.match(/```sql\n([\s\S]*?)```/);
    const generatedSql = sqlMatch ? sqlMatch[1].trim() : null;
    
    // Extract explanation
    const explanationMatch = response.match(/Explanation:([\s\S]*?)(?=Visualization|$)/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : null;
    
    // Extract visualization recommendation
    const visualizationMatch = response.match(/Visualization:([\s\S]*?)$/i);
    const visualization = visualizationMatch ? visualizationMatch[1].trim() : null;
    
    return {
      sql: generatedSql,
      explanation,
      visualizationType: visualization,
      fullResponse: response
    };
    
  } catch (error) {
    console.error("Error generating SQL:", error);
    throw error;
  }
}

// Execute SQL query with PostgreSQL
async function executeQuery(sql) {
  try {
    const client = await pool.connect();
    const results = await client.query(sql);
    client.release();
    return results.rows;
  } catch (error) {
    console.error("Error executing SQL:", error);
    throw error;
  }
}

// Generate natural language summary of results
async function generateSummary(query, sqlQuery, results, explanation, visualizationType) {
  try {
    // Convert results to string, but limit size
    let resultsText = JSON.stringify(results);
    if (resultsText.length > 10000) {
      resultsText = JSON.stringify(results.slice(0, 20)) + " ... (truncated)";
    }
    
    // Get Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an AI data analyst expert at explaining data analysis results clearly.

Your task is to:
1. Interpret the SQL query results
2. Create a clear, natural language summary of the findings
3. Highlight key insights that answer the user's question
4. Explain any patterns or trends in the data
5. Keep your explanation concise and business-focused

Rules:
- Use plain language a business user would understand
- Relate the results back to the original question
- Highlight 3-5 key insights from the data
- Provide context when discussing metrics
- Avoid technical jargon unless necessary
- Don't just repeat numbers from the results - interpret them
- Point out any limitations or caveats to the analysis
- Be honest about what the data does and doesn't show

Original question: "${query}"

SQL query used:
\`\`\`sql
${sqlQuery}
\`\`\`

Query explanation: ${explanation}

Suggested visualization: ${visualizationType}

Query results:
${resultsText}

Please provide a clear, natural language summary of what these results mean in business terms.`;

    // Generate content
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

// API endpoint to process natural language queries
app.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Generate SQL from natural language query
    const generatedData = await generateSQL(query);
    const sqlQuery = generatedData.sql;
    const explanation = generatedData.explanation;
    const visualizationType = generatedData.visualizationType;
    
    if (!sqlQuery) {
      return res.status(500).json({ error: 'Failed to generate SQL query' });
    }
    
    // Execute the SQL query
    const results = await executeQuery(sqlQuery);
    
    // Generate natural language summary
    const summary = await generateSummary(query, sqlQuery, results, explanation, visualizationType);
    
    res.json({
      query,
      sql: sqlQuery,
      explanation,
      results,
      summary,
      visualizationType
    });
    
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'postgresql' });
});

// Add a root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Query SQL API is running',
    endpoints: {
      health: '/health',
      query: '/api/query'
    },
    version: '1.0.0'
  });
});

// Load schema on startup for non-serverless environments
if (process.env.NODE_ENV !== 'production') {
  getDatabaseSchema().then(() => {
    console.log("Database schema loaded");
  }).catch(err => {
    console.error("Failed to load database schema:", err);
  });
  
  // Start the server for local development
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export the Express API for Vercel serverless deployment
module.exports = app;
