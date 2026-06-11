const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://laebhzpqplbjlcgsvydg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  let log = "";
  const tables = [
    'profils', 'pharmacies', 'medicaments', 'stocks', 'livraisons', 'pharmacie_personnel',
    'livraison_details', 'livraison_elements', 'livraison_medicaments', 'commande_elements',
    'commande_medicaments', 'commandes', 'details_livraison', 'elements_livraison',
    'panier', 'panier_elements', 'items_livraison', 'articles_livraison'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        log += `Table '${table}' -> Error: ${error.message}\n`;
      } else {
        log += `Table '${table}' -> EXISTS. Row count: ${data.length}\n`;
        if (data.length > 0) {
          log += `  Columns: ${Object.keys(data[0]).join(', ')}\n`;
          log += `  Sample: ${JSON.stringify(data[0])}\n`;
        }
      }
    } catch (e) {
      log += `Table '${table}' -> Exception: ${e.message}\n`;
    }
  }
  
  fs.writeFileSync('schema_output.txt', log);
  console.log("Wrote results to schema_output.txt");
}

checkSchema();
