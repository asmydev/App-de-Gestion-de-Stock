import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function showRawData() {
    console.log("=== RAW DATABASE DATA ===\n");

    // Get all movements with raw column names
    const { data: movements } = await supabase.from('stock_movements').select('*');
    console.log("MOVEMENTS (first 2):");
    movements?.slice(0, 2).forEach(m => {
        console.log(JSON.stringify(m, null, 2));
    });

    // Get all stores with raw column names
    const { data: stores } = await supabase.from('stores').select('*');
    console.log("\nSTORES:");
    stores?.forEach(s => {
        console.log(JSON.stringify(s, null, 2));
    });

    // Get agencies
    const { data: agencies } = await supabase.from('agencies').select('*');
    console.log("\nAGENCIES (first 3):");
    agencies?.slice(0, 3).forEach(a => {
        console.log(JSON.stringify(a, null, 2));
    });
}

showRawData();
