const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://laebhzpqplbjlcgsvydg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function testAuthInsert() {
  let log = "";
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const email = `patient${randomSuffix}@gmail.com`;
  const password = 'Password123!';
  
  try {
    log += `Signing up patient ${email}...\n`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: 'Test Patient',
          telephone: '654321098',
          role: 'PATIENT'
        }
      }
    });
    
    if (signUpError) {
      log += `Sign Up Error: ${signUpError.message}\n`;
      fs.writeFileSync('auth_insert_output.txt', log);
      return;
    }
    
    const user = signUpData.user;
    log += `Sign Up Success! User ID: ${user.id}\n`;
    
    // Sign in to get session
    log += "Signing in...\n";
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      log += `Sign In Error: ${signInError.message}\n`;
      fs.writeFileSync('auth_insert_output.txt', log);
      return;
    }
    
    const session = signInData.session;
    log += `Sign In Success! Access Token present: ${!!session.access_token}\n`;
    
    // Create client with the session's access token to act as the patient
    const patientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    });
    
    log += "Attempting to insert a livraison as patient...\n";
    const { data: insertData, error: insertError } = await patientSupabase.from('livraisons').insert({
      pharmacie_id: 2,
      patient_id: user.id,
      statut: 'EN_ATTENTE',
      code_securite: '1234'
    }).select();
    
    if (insertError) {
      log += `Insert Error: ${insertError.message} (${insertError.code})\n`;
      log += "Retrying insert without code_securite...\n";
      const { data: insertData2, error: insertError2 } = await patientSupabase.from('livraisons').insert({
        pharmacie_id: 2,
        patient_id: user.id,
        statut: 'EN_ATTENTE'
      }).select();
      
      if (insertError2) {
        log += `Retry Insert Error: ${insertError2.message} (${insertError2.code})\n`;
      } else {
        log += `Retry Insert Success! Columns:\n${JSON.stringify(insertData2, null, 2)}\n`;
        // Clean up
        const testId = insertData2[0].id;
        await patientSupabase.from('livraisons').delete().eq('id', testId);
      }
    } else {
      log += `Insert Success! Columns:\n${JSON.stringify(insertData, null, 2)}\n`;
      // Clean up
      const testId = insertData[0].id;
      await patientSupabase.from('livraisons').delete().eq('id', testId);
    }
    
  } catch (e) {
    log += `Exception: ${e.message}\n`;
  }
  
  fs.writeFileSync('auth_insert_output.txt', log);
  console.log("Wrote authenticated insert results to auth_insert_output.txt");
}

testAuthInsert();
