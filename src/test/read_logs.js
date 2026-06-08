const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('agent_execution_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching logs:', error);
  } else {
    console.log('--- RECENT AGENT LOGS ---');
    data.forEach(log => {
      console.log(`[${log.created_at}] Agent: ${log.agent_name} | Status: ${log.status}`);
      if (log.error_message) {
        console.log(`Error: ${log.error_message}`);
      }
      console.log('-------------------------');
    });
  }
}
run();
