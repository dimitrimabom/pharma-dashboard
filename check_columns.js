const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://laebhzpqplbjlcgsvydg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  let log = "";
  const columnsToTest = [
    'id', 'statut', 'cree_le', 'pharmacie_id', 'patient_id', 'livreur_id', 
    'code_securite', 'code', 'securite', 'destination', 'adresse', 'adresse_livraison',
    'total', 'prix', 'distance', 'elements', 'medicaments', 'created_at'
  ];
  
  for (const col of columnsToTest) {
    try {
      const { data, error } = await supabase.from('livraisons').select(col).limit(1);
      if (error) {
        log += `Column '${col}': NOT FOUND or ERROR: ${error.message} (${error.code})\n`;
      } else {
        log += `Column '${col}': EXISTS\n`;
      }
    } catch (e) {
      log += `Column '${col}': Exception: ${e.message}\n`;
    }
  }
  
  fs.writeFileSync('columns_output.txt', log);
  console.log("Wrote columns output to columns_output.txt");
}

checkColumns();
