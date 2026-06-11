const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://laebhzpqplbjlcgsvydg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  let log = "";
  try {
    log += "Attempting insert into 'livraisons'...\n";
    const { data, error } = await supabase.from('livraisons').insert({
      pharmacie_id: 2,
      patient_id: '185fd100-07bd-48f4-903f-ae3302ae07a5',
      statut: 'EN_ATTENTE'
    }).select();
    
    if (error) {
      log += `Insert Error: ${error.message} (${error.code})\n`;
    } else {
      log += `Insert Success! Inserted row:\n${JSON.stringify(data, null, 2)}\n`;
      
      // Now delete the test row
      if (data && data.length > 0) {
        const testId = data[0].id;
        log += `Deleting test row with ID: ${testId}...\n`;
        const { error: delError } = await supabase.from('livraisons').delete().eq('id', testId);
        if (delError) {
          log += `Delete Error: ${delError.message}\n`;
        } else {
          log += "Delete Success!\n";
        }
      }
    }
  } catch (e) {
    log += `Exception: ${e.message}\n`;
  }
  
  fs.writeFileSync('insert_output.txt', log);
  console.log("Wrote insert results to insert_output.txt");
}

testInsert();
