import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function clearMetadata() {
  console.log('Fetching users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const user of users) {
    const meta = user.user_metadata || {};
    console.log(`User ${user.id} metadata keys:`, Object.keys(meta));
    // Let's print the length of string values
    for (const key of Object.keys(meta)) {
      if (typeof meta[key] === 'string') {
        console.log(`  ${key} length: ${meta[key].length}`);
      } else {
        console.log(`  ${key} type: ${typeof meta[key]}`);
      }
    }
    
    // Clear EVERYTHING except the essentials (email, name, avatar_url, etc)
    const newMeta = {
      email: meta.email,
      email_verified: meta.email_verified,
      phone_verified: meta.phone_verified,
      sub: meta.sub,
      avatar_url: meta.avatar_url,
      full_name: meta.full_name,
      name: meta.name,
      provider_id: meta.provider_id
    };
    
    console.log(`Updating user ${user.id} to minimal metadata...`);
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: newMeta
    });
  }
  console.log('Done!');
}

clearMetadata();
