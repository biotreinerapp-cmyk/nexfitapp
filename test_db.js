import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema_info'); // if exists, or just try to query highlights
  if (error) console.log(error);

  const { data: cols, error: colsErr } = await supabase
    .from('highlight_offers')
    .select('*')
    .limit(1);
    
  console.log("highlight_offers columns:", colsErr ? colsErr : (cols.length ? Object.keys(cols[0]) : "empty, but exists"));
  
  const { data: reqs, error: reqsErr } = await supabase
    .from('highlight_purchase_requests')
    .select('*')
    .limit(1);
    
  console.log("highlight_purchase_requests:", reqsErr ? reqsErr : (reqs.length ? Object.keys(reqs[0]) : "empty, but exists"));
}

check();
