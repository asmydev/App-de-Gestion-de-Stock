
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

async function deleteAgency() {
    console.log("Attempting to delete agency 'Siège'...");

    // Find ALL agencies with name 'Siège'
    const { data: agencies, error: findError } = await supabase
        .from('agencies')
        .select('id')
        .eq('name', 'Siège'); // Removed .single()

    if (findError) {
        console.error("Error finding agencies:", findError.message);
        return;
    }

    if (!agencies || agencies.length === 0) {
        console.log("No Agency 'Siège' found.");
        return;
    }

    console.log(`Found ${agencies.length} agency(ies) named 'Siège'. Deleting...`);

    const idsToDelete = agencies.map(a => a.id);

    const { error: deleteError } = await supabase
        .from('agencies')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error("Error deleting agency:", deleteError.message);
    } else {
        console.log("Successfully deleted 'Siège' agency(ies).");
    }
}

deleteAgency();
