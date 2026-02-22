const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: cols, error: colsErr } = await supabase
        .from('highlight_offers')
        .select('*')
        .limit(1);

    console.log("highlight_offers:", colsErr ? colsErr : (cols.length ? Object.keys(cols[0]) : "empty, but exists"));

    const { data: reqs, error: reqsErr } = await supabase
        .from('highlight_purchase_requests')
        .select('*')
        .limit(1);

    console.log("highlight_purchase_requests:", reqsErr ? reqsErr : (reqs.length ? Object.keys(reqs[0]) : "empty, but exists"));

    const { data: act, error: actErr } = await supabase
        .from('marketplace_stores')
        .select('highlight_until')
        .limit(1);

    if (!actErr) {
        console.log("marketplace_stores has highlight_until:", act.length ? Object.keys(act[0]) : "empty");
    } else {
        console.log("marketplace_stores highlight_until check failed:", actErr.message);
    }
}

check();
