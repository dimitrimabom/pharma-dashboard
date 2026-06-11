const fs = require('fs');

const url = 'https://laebhzpqplbjlcgsvydg.supabase.co/rest/v1/';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

async function fetchSchema() {
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const definitions = data.definitions || {};
    console.log("Exposed definitions (tables):", Object.keys(definitions));
    
    // Print details of each table's properties
    for (const [tableName, definition] of Object.entries(definitions)) {
      console.log(`\nTable: ${tableName}`);
      if (definition.properties) {
        for (const [propName, prop] of Object.entries(definition.properties)) {
          console.log(`  - ${propName}: ${prop.type} (${prop.format || ''}) - ${prop.description || ''}`);
        }
      }
    }
    
    fs.writeFileSync('db_openapi_schema.json', JSON.stringify(data, null, 2));
    console.log("\nSaved full schema to db_openapi_schema.json");
  } catch (error) {
    console.error("Error fetching schema:", error.message);
  }
}

fetchSchema();
