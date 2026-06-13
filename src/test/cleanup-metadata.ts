import { supabase } from '../services/llm/evaluator/supabaseClient';

async function main() {
  console.log('Fetching all users from Supabase Auth...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Found ${users.length} users in the database.`);
  let cleanCount = 0;

  for (const user of users) {
    const meta = user.user_metadata || {};
    if (meta.resume_embedding || meta.resume_text) {
      console.log(`User ${user.email} (${user.id}) has legacy large metadata. Cleaning up...`);
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...meta,
            resume_embedding: null,
            resume_text: null,
          }
        }
      );

      if (updateError) {
        console.error(`Failed to clean metadata for ${user.email}:`, updateError.message);
      } else {
        console.log(`Successfully cleaned metadata for ${user.email}.`);
        cleanCount++;
      }
    } else {
      console.log(`User ${user.email} is already clean.`);
    }
  }

  console.log(`Cleanup complete. Cleaned ${cleanCount} users.`);
}

main().catch(console.error);
