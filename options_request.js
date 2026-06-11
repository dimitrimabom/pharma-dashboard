const url = 'https://laebhzpqplbjlcgsvydg.supabase.co/rest/v1/livraisons';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJoenBxcGxiamxjZ3N2eWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzgyODQsImV4cCI6MjA5NjYxNDI4NH0.G-TvJjd6JRPJO5k1qH2YopjvXkzoFgV7rjCqAoQmE1M';

async function fetchOptions() {
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log("Headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const text = await response.text();
    console.log("Body:", text || "(empty)");
  } catch (error) {
    console.error("Error fetching options:", error.message);
  }
}

fetchOptions();
