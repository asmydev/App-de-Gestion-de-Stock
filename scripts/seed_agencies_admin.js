
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
            if (k === 'VITE_SUPABASE_KEY') SUPABASE_KEY = v;
        }
    });
} catch (e) {
    console.error("Could not read .env file");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_AGENCIES = [
    'BERTOUA', 'DOUALA', 'GAROUA BOULAÏ', 'GUIDER', 'KRIBI', 'MAROUA', 'NGAOUNDERE', 'NGONG'
];

async function seed() {
    console.log("🌱 Seeding Agencies and Admin...");

    // 1. Seed Agencies
    for (const name of TARGET_AGENCIES) {
        const { data, error } = await supabase
            .from('agencies')
            .upsert({ name }, { onConflict: 'name' }) // Requires name to be unique or handle differently if not
            .select()
            .single(); // Upsert might return null if no change? Actually Supabase upsert works well.

        if (error) {
            // If name is not unique constraint, correct it or check existence.
            // Usually onConflict relies on a unique index. 
            // If no unique index on name, this might just insert duplicates.
            // Let's filter first to be safe.
            const { data: existing } = await supabase.from('agencies').select('id').eq('name', name).maybeSingle();
            if (!existing) {
                await supabase.from('agencies').insert({ name });
                console.log(`✅ Agency Created: ${name}`);
            } else {
                console.log(`ℹ️ Agency Exists: ${name}`);
            }
        } else {
            console.log(`✅ Agency Processed: ${name}`);
        }
    }

    // 2. Create Admin User
    const { data: admin, error: adminError } = await supabase
        .from('app_users')
        .insert([{
            username: 'admin',
            full_name: 'Administrateur Général',
            role: 'admin',
            password_hash: 'admin123'
        }])
        .select()
        .single();

    if (adminError) {
        if (adminError.code === '23505') {
            console.log("ℹ️ Admin user already exists.");
        } else {
            console.error("❌ Error creating admin:", adminError.message);
        }
    } else {
        console.log("✅ Admin user created: 'admin' / 'admin123'");
    }

    console.log("\nDone!");
}

seed();
