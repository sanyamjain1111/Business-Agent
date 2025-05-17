// App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Send, ChevronDown } from 'lucide-react';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'system', 
      content: 'Hello! I can help you analyze your e-commerce data. Ask me complex business questions and I\'ll provide insights with visualizations.' 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sample queries to help users get started
  const sampleQueries = [
    "What are the top 5 products by revenue?",
    "Which marketing campaigns had the highest ROI in the last 6 months?",
    "Compare sales performance across different channels",
    "What's the customer retention rate by segment?",
    "Which warehouses have inventory levels below the reorder point?",
    "Show me the relationship between discount amount and order total"
  ];

  // Example visualization types mapping
  const visualizationTypes = {
    'bar chart': renderBarChart,
    'line chart': renderLineChart,
    'pie chart': renderPieChart,
    'table': renderTable
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus on input after loading
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // FIXED API URL DETERMINATION
  // Hardcoded API URL based on environment to ensure consistent behavior
  const getApiUrl = () => {
    // Check if we're in the production environment by examining the current URL
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
      // Use the deployed backend URL
      return 'https://business-agent-mk5g.vercel.app/api/query';
    } else {
      // Use local development URL
      return 'http://localhost:5000/api/query';
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!input.trim() && (!e || e.type !== 'click')) return;
    
    // Get query text either from input or from clicked sample query
    const queryText = e?.type === 'click' ? e.target.textContent : input;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: queryText }]);
    setInput('');
    setLoading(true);
    setError(null);
    
    try {
      // Get the appropriate API URL
      const apiUrl = getApiUrl();
      
      console.log("Connecting to API at:", apiUrl); // Debug logging
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryText }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();

      // Rest of code remains the same
      if (data.summary) {
        // Remove all asterisks
        data.summary = data.summary.replace(/\*/g, '');
        
        // Format numbered points by replacing "1." with "\n1." to ensure each point starts on a new line
        data.summary = data.summary.replace(/(\d+\.)/g, '\n$1');
        
        // Clean up any potential double newlines that might be created
        data.summary = data.summary.replace(/\n\s*\n/g, '\n\n');
      }
      
      // Add assistant response to chat
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.summary,
          sql: data.sql,
          results: data.results,
          visualizationType: data.visualizationType?.toLowerCase() 
        }
      ]);
      
    } catch (err) {
      console.error('Error querying the database:', err);
      setError(err.message);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `I'm sorry, I encountered an error while processing your query: ${err.message}` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine which visualization to render
  function renderVisualization(message) {
    if (!message.results || message.role !== 'assistant') return null;
    
    const visType = message.visualizationType || '';
    
    for (const [type, renderFunc] of Object.entries(visualizationTypes)) {
      if (visType.includes(type)) {
        return renderFunc(message.results);
      }
    }
    
    // Default to table if visualization type not specified or recognized
    return renderTable(message.results);
  }

  // Render bar chart
  function renderBarChart(data) {
    if (!data || data.length === 0) return null;
    
    // Identify potential numeric and categorical columns
    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    
    // Find a good candidate for x-axis (categorical) and y-axis (numeric)
    const numericColumns = keys.filter(key => typeof firstItem[key] === 'number');
    const categoricalColumns = keys.filter(key => typeof firstItem[key] !== 'number');
    
    if (numericColumns.length === 0 || categoricalColumns.length === 0) {
      return renderTable(data); // Fallback if we can't identify good columns
    }
    
    // Use the first categorical column for x-axis and first numeric for y-axis
    const xAxisKey = categoricalColumns[0];
    
    // Limit to top 10 results for better visualization
    const limitedData = data.slice(0, 10);
    
    // Generate random colors for bars
    const colors = numericColumns.map(() => 
      `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    );
    
    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={limitedData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xAxisKey} 
              angle={-45} 
              textAnchor="end"
              height={70} 
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericColumns.map((column, index) => (
              <Bar 
                key={column} 
                dataKey={column} 
                fill={colors[index]} 
                name={column} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Render line chart
  function renderLineChart(data) {
    if (!data || data.length === 0) return null;
    
    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    
    // Look for date/time column first
    const dateColumns = keys.filter(key => 
      key.toLowerCase().includes('date') || 
      key.toLowerCase().includes('time') || 
      key.toLowerCase().includes('dt')
    );
    
    const numericColumns = keys.filter(key => typeof firstItem[key] === 'number');
    
    if (numericColumns.length === 0) {
      return renderTable(data); // Fallback if no numeric columns
    }
    
    // Use date column if available, otherwise the first non-numeric column
    const xAxisKey = dateColumns.length > 0 
      ? dateColumns[0] 
      : keys.find(key => typeof firstItem[key] !== 'number') || keys[0];
    
    // Limit to reasonable amount of data points
    const limitedData = data.length > 30 ? data.slice(0, 30) : data;
    
    // Generate random colors for lines
    const colors = numericColumns.map(() => 
      `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    );
    
    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={limitedData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xAxisKey} 
              angle={-45} 
              textAnchor="end" 
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericColumns.slice(0, 5).map((column, index) => (
              <Line 
                key={column}
                type="monotone"
                dataKey={column}
                stroke={colors[index]}
                name={column}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Render pie chart
  function renderPieChart(data) {
    if (!data || data.length === 0) return null;
    
    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    
    // Find a categorical field and a numeric field
    const numericKey = keys.find(key => typeof firstItem[key] === 'number');
    const labelKey = keys.find(key => typeof firstItem[key] !== 'number');
    
    if (!numericKey || !labelKey) {
      return renderTable(data); // Fallback if we can't identify good columns
    }
    
    // Limit to top 8 slices for better visualization
    const limitedData = data.slice(0, 8);
    
    // Generate colors for slices
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'];
    
    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={limitedData}
              dataKey={numericKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={150}
              fill="#8884d8"
              label={entry => entry[labelKey]}
            >
              {limitedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Render table
  function renderTable(data) {
    if (!data || data.length === 0) return null;
    
    // Get column headers from first item
    const headers = Object.keys(data[0]);
    
    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map(header => (
                  <td key={`${rowIndex}-${header}`}>
                    {row[header] !== null ? 
                      (typeof row[header] === 'object' ? 
                        JSON.stringify(row[header]) : 
                        row[header].toString()) : 
                      'NULL'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 15 && (
          <div className="table-note">Showing 15 of {data.length} rows</div>
        )}
      </div>
    );
  }

  // Render SQL query display with toggle
  function SqlDisplay({ sql }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="sql-container">
        <div 
          className="sql-header" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>SQL Query</span>
          <ChevronDown className={`icon ${isOpen ? 'open' : ''}`} size={20} />
        </div>
        {isOpen && (
          <pre className="sql-content">{sql}</pre>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>AI Data Agent</h1>
        <p>Ask complex business questions about your e-commerce data</p>
      </header>
      
      <main>
        <div className="chat-container">
          <div className="messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="message-content">{message.content}</div>
                
                {message.sql && (
                  <SqlDisplay sql={message.sql} />
                )}
                
                {message.results && renderVisualization(message)}
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="loading">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
            {error && (
              <div className="message error">
                <div className="message-content">Error: {error}</div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="input-form">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a business question..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
        
        <div className="sample-queries">
          <h3>Example Questions</h3>
          <div className="query-buttons">
            {sampleQueries.map((query, index) => (
              <button 
                key={index} 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
