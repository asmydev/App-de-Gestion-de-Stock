
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
const envPath = path.resolve(__dirname, '../.env');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            const k = key.trim();
            const v = value.trim();
            if (k === 'VITE_SUPABASE_URL') SUPABASE_URL = v;
            if (k === 'VITE_SUPABASE_ANON_KEY' || k === 'VITE_SUPABASE_KEY') SUPABASE_KEY = v;
        }
    });
} catch (e) {
    console.error("Could not read .env file");
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log("🌱 Seeding data...");

    // 1. Create Agency
    const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert([{ name: 'Agence Siège' }])
        .select()
        .single();

    let agencyId = agency?.id;

    if (agencyError) {
        // If agency exists (conflict), try to fetch it
        // Note: Agencies table might not have unique constraint on name, but let's assume fine for now or just fetch one.
        if (agencyError.code === '42P01') {
            console.error("\n❌ CRITICAL: Database tables not found. Run SQL schema first!");
            return;
        }
        console.log("ℹ️ Could not insert agency (maybe RLS or exists). Trying to fetch existing...");
        const { data: existing } = await supabase.from('agencies').select('id').limit(1).single();
        if (existing) {
            agencyId = existing.id;
            console.log("✅ Using existing agency.");
        } else {
            console.error("❌ Failed to create or find agency:", agencyError.message);
            return;
        }
    } else {
        console.log("✅ Agency created.");
    }

    if (!agencyId) return;

    // 2. Create Store
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert([{ name: 'Magasin Principal', agency_id: agencyId }])
        .select()
        .single();

    if (storeError) {
        console.log("ℹ️ Store creation note:", storeError.message);
    } else {
        console.log("✅ Store created.");
    }

    // 3. Create User
    const { data: user, error: userError } = await supabase
        .from('app_users')
        .insert([{
            username: 'maga1',
            full_name: 'Jean Magasinier',
            role: 'magasinier',
            password_hash: 'password123'
        }])
        .select()
        .single();

    if (userError) {
        if (userError.code === '23505') {
            console.log("✅ User 'maga1' already exists.");
        } else {
            console.error("❌ Error creating user:", userError.message);
        }
    } else {
        console.log("✅ User created: maga1");
    }

    console.log("\n🎉 Ready!");
    console.log("URL: http://localhost:8080 (or see terminal)");
    console.log("User: maga1");
    console.log("Pass: password123");
}

seed();
