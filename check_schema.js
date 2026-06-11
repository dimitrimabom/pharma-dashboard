const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://laebhzpqplbjlcgsvydg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log("Checking database schema...");
  
  const tables = ['profils', 'pharmacies', 'medicaments', 'stocks', 'livraisons'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' error:`, error.message);
      } else {
        console.log(`Table '${table}' exists. Columns:`, data.length > 0 ? Object.keys(data[0]) : "(empty table)");
        if (data.length > 0) {
          console.log(`Sample row for '${table}':`, data[0]);
        }
      }
    } catch (e) {
      console.log(`Table '${table}' exception:`, e.message);
    }
  }
}

checkSchema();
