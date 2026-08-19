
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAgencies() {
    console.log("Listing all agencies...");

    const { data: agencies, error } = await supabase
        .from('agencies')
        .select('*');

    if (error) {
        console.error("Error fetching agencies:", error.message);
        return;
    }

    if (!agencies || agencies.length === 0) {
        console.log("No agencies found.");
    } else {
        console.table(agencies);
        // Check for 'Siège' specifically
        const siege = agencies.find(a => a.name.trim().toLowerCase() === 'siege' || a.name.trim().toLowerCase() === 'siège');
        if (siege) {
            console.log("FOUND 'Siège' (or similar):", siege);
        } else {
            console.log("Did not find an agency named 'Siège' in the returned list.");
        }
    }
}

listAgencies();
