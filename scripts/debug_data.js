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

async function debugData() {
    console.log("=== DEBUGGING STORE-MOVEMENT RELATIONSHIPS ===\n");

    // Get all movements
    const { data: movements } = await supabase.from('stock_movements').select('*');
    console.log("MOVEMENTS:", movements?.length || 0);
    if (movements) {
        movements.forEach(m => {
            console.log(`  - Movement ID: ${m.id.slice(0, 8)}... | StoreID: ${m.storeId} | Type: ${m.movementType} | Qty: ${m.quantity}`);
        });
    }

    // Get all stores
    const { data: stores } = await supabase.from('stores').select('*');
    console.log("\nSTORES:", stores?.length || 0);
    if (stores) {
        stores.forEach(s => {
            console.log(`  - Store: ${s.name} | ID: ${s.id} | AgencyID: ${s.agencyId}`);
        });
    }

    // Get all agencies
    const { data: agencies } = await supabase.from('agencies').select('*');
    console.log("\nAGENCIES:", agencies?.length || 0);
    if (agencies) {
        agencies.forEach(a => {
            console.log(`  - Agency: ${a.name} | ID: ${a.id}`);
        });
    }

    // Check matching
    console.log("\n=== MATCHING ANALYSIS ===");
    if (movements && stores && agencies) {
        const storeIds = stores.map(s => s.id);
        const unmatchedMovements = movements.filter(m => !storeIds.includes(m.storeId));
        console.log(`Movements with unmatched storeId: ${unmatchedMovements.length}`);
        if (unmatchedMovements.length > 0) {
            unmatchedMovements.forEach(m => {
                console.log(`  - Movement storeId: ${m.storeId} NOT FOUND in stores table!`);
            });
        }

        const agencyIds = agencies.map(a => a.id);
        const unmatchedStores = stores.filter(s => !agencyIds.includes(s.agencyId));
        console.log(`Stores with unmatched agencyId: ${unmatchedStores.length}`);
        if (unmatchedStores.length > 0) {
            unmatchedStores.forEach(s => {
                console.log(`  - Store: ${s.name} agencyId: ${s.agencyId} NOT FOUND in agencies table!`);
            });
        }
    }
}

debugData();
