import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: cols, error: colsErr } = await supabase
    .from('marketplace_stores')
    .select('*')
    .limit(1);
    
  console.log("marketplace_stores:", colsErr ? colsErr : (cols?.length ? Object.keys(cols[0]) : "empty, but exists"));
}

check();
