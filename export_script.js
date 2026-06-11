import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportTable(tableName) {
  console.log(`Exporting table: ${tableName}`);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Error exporting ${tableName}:`, error);
    return;
  }
  
  const filePath = path.join('/mnt/documents/database_export', `${tableName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${tableName} to ${filePath}`);
}

async function run() {
  const tables = [
    'occurrences', 'strategy_notes', 'competitor_studies', 'strategy_history', 
    'profiles', 'base_strategy_requests', 'ai_usage', 'user_roles', 
    'strategy_save_attempts', 'ai_quota_settings', 'strategies', 'store_requests', 
    'pending_activities', 'ai_context_entries', 'training_courses', 'strategic_assistant_links'
  ];

  for (const table of tables) {
    await exportTable(table);
  }
  console.log('All tables exported');
}

run();
