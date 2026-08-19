
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Store, TrendingUp, Package, ArrowUpRight, X } from "lucide-react";
import { Agency, Store as StoreType, Product, StockMovement } from "@/types";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export default function AdminDashboard() {
    // Data States
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);

    // Agency Detail Modal State
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [isAgencyDetailOpen, setIsAgencyDetailOpen] = useState(false);

    useEffect(() => {
        fetchAllData();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('admin_dashboard_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stock_movements' },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchAllData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stores' },
                (payload) => {
                    console.log('Store change received!', payload);
                    fetchAllData();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchAllData = async () => {
        try {
            const [
                { data: agenciesData, error: agenciesError },
                { data: storesData, error: storesError },
                { data: productsData, error: productsError },
                { data: movementsData, error: movementsError }
            ] = await Promise.all([
                supabase.from('agencies').select('*'),
                supabase.from('stores').select('*'),
                supabase.from('products').select('*'),
                supabase.from('stock_movements').select('*')
            ]);

            // Debug logging
            console.log('Admin Dashboard - Data fetch results:', {
                agencies: agenciesData?.length || 0,
                stores: storesData?.length || 0,
                products: productsData?.length || 0,
                movements: movementsData?.length || 0
            });

            if (agenciesError) console.error('Agencies error:', agenciesError);
            if (storesError) console.error('Stores error:', storesError);
            if (productsError) console.error('Products error:', productsError);
            if (movementsError) console.error('Movements error:', movementsError);

            // Transform snake_case to camelCase for stores
            const transformedStores = storesData?.map(s => ({
                id: s.id,
                name: s.name,
                agencyId: s.agency_id,  // snake_case to camelCase
                createdAt: s.created_at
            })) || [];

            // Transform snake_case to camelCase for movements
            const transformedMovements = movementsData?.map(m => ({
                id: m.id,
                storeId: m.store_id,          // snake_case to camelCase
                productId: m.product_id,      // snake_case to camelCase
                userId: m.user_id,            // snake_case to camelCase
                movementType: m.movement_type,// snake_case to camelCase
                quantity: m.quantity,
                referenceDoc: m.reference_doc,// snake_case to camelCase
                dateMovement: m.date_movement,// snake_case to camelCase
                createdAt: m.created_at       // snake_case to camelCase
            })) || [];

            if (agenciesData) setAgencies(agenciesData);
            setStores(transformedStores as StoreType[]);
            if (productsData) setProducts(productsData);
            setMovements(transformedMovements as StockMovement[]);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Analytics Computations ---

    // 1. Total Global Movements
    const exits = movements.filter(m => m.movementType === 'EXIT');
    const totalMovementsCount = movements.length;

    // 2. Activity by Agency (Volume)
    const agencyActivityData = agencies.map(agency => {
        // Find stores for this agency
        const agencyStoreIds = stores.filter(s => s.agencyId === agency.id).map(s => s.id);

        // Find movements for these stores
        const agencyMovements = movements.filter(m => agencyStoreIds.includes(m.storeId));

        return {
            name: agency.name,
            count: agencyMovements.length
        };
    }).sort((a, b) => b.count - a.count);

    // 3. Top Products (Global Volume)
    const productPerformance = products.map(prod => {
        const prodExits = exits.filter(m => m.productId === prod.id);
        const totalQty = prodExits.reduce((acc, m) => acc + Number(m.quantity), 0);
        return {
            name: prod.name,
            quantity: totalQty,
            agencyId: prod.agencyId
        };
    }).sort((a, b) => b.quantity - a.quantity).slice(0, 5);



    return (
        <AppLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord Général</h1>
                    <p className="text-muted-foreground">Vue d'ensemble et gestion des structures.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Volume Transactions</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalMovementsCount}</div>
                            <p className="text-xs text-muted-foreground">Mouvements (Entrées/Sorties)</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Nombre d'Agences</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{agencies.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Nombre de Magasins</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stores.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <div className="grid gap-4 md:grid-cols-7">
                    {/* Agency Performance Chart */}
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Activité par Agence</CardTitle>
                            <CardDescription>Volume de mouvements par agence</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={agencyActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        angle={-35}
                                        textAnchor="end"
                                        height={80}
                                        interval={0}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`${value}`, "Mouvements"]}
                                        labelStyle={{ color: "black" }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Top Produits (Sorties)</CardTitle>
                            <CardDescription>Produits les plus sortis (Quantité)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {productPerformance.map((prod, i) => {
                                    const agencyName = agencies.find(a => a.id === prod.agencyId)?.name;
                                    return (
                                        <div key={i} className="flex items-center">
                                            <div className="space-y-1 flex-1">
                                                <p className="text-sm font-medium leading-none">{prod.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {agencyName}
                                                </p>
                                            </div>
                                            <div className="font-bold">
                                                {prod.quantity}
                                            </div>
                                        </div>
                                    );
                                })}
                                {productPerformance.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Agency Breakdown Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agencyActivityData.map((agency) => {
                        const agencyData = agencies.find(a => a.name === agency.name);
                        return (
                            <Card
                                key={agency.name}
                                className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => {
                                    if (agencyData) {
                                        setSelectedAgency(agencyData);
                                        setIsAgencyDetailOpen(true);
                                    }
                                }}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{agency.name}</CardTitle>
                                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{agency.count}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Mouvements totaux
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

            </div>

            {/* Agency Detail Dialog */}
            <Dialog open={isAgencyDetailOpen} onOpenChange={setIsAgencyDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Dashboard - {selectedAgency?.name}</DialogTitle>
                        <DialogDescription>
                            Vue détaillée de l'activité de l'agence
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAgency && (() => {
                        // Compute agency-specific data
                        const agencyStores = stores.filter(s => s.agencyId === selectedAgency.id);
                        const agencyStoreIds = agencyStores.map(s => s.id);
                        const agencyMovements = movements.filter(m => agencyStoreIds.includes(m.storeId));
                        const agencyEntries = agencyMovements.filter(m => m.movementType === 'ENTRY' || m.movementType === 'RETURN');
                        const agencyExits = agencyMovements.filter(m => m.movementType === 'EXIT');
                        const totalEntriesQty = agencyEntries.reduce((acc, m) => acc + Number(m.quantity), 0);
                        const totalExitsQty = agencyExits.reduce((acc, m) => acc + Number(m.quantity), 0);

                        // Store activity data for chart
                        const storeActivityData = agencyStores.map(store => {
                            const storeMovements = agencyMovements.filter(m => m.storeId === store.id);
                            return {
                                name: store.name,
                                count: storeMovements.length
                            };
                        });

                        // Top products for this agency
                        const agencyProductPerformance = products.map(prod => {
                            const prodExits = agencyExits.filter(m => m.productId === prod.id);
                            const totalQty = prodExits.reduce((acc, m) => acc + Number(m.quantity), 0);
                            return { name: prod.name, quantity: totalQty };
                        }).filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

                        return (
                            <div className="space-y-6 py-4">
                                {/* KPI Cards */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Magasins</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{agencyStores.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Mouvements</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{agencyMovements.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-green-600">Entrées</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-600">{totalEntriesQty}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-orange-600">Sorties</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-orange-600">{totalExitsQty}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Store Activity Chart */}
                                {storeActivityData.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Activité par Magasin</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={storeActivityData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" fontSize={12} />
                                                    <YAxis fontSize={12} />
                                                    <Tooltip
                                                        formatter={(value: number) => [`${value}`, "Mouvements"]}
                                                        labelStyle={{ color: "black" }}
                                                    />
                                                    <Bar dataKey="count" name="Mouvements" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Top Products for this agency */}
                                {agencyProductPerformance.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Top Produits (Sorties)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {agencyProductPerformance.map((prod, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{prod.name}</span>
                                                        <span className="font-bold">{prod.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Recent Movements Table */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Derniers Mouvements</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Magasin</TableHead>
                                                    <TableHead>Produit</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Quantité</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {agencyMovements.slice(0, 10).map(m => {
                                                    const store = agencyStores.find(s => s.id === m.storeId);
                                                    const product = products.find(p => p.id === m.productId);
                                                    const isEntry = m.movementType === 'ENTRY' || m.movementType === 'RETURN';
                                                    return (
                                                        <TableRow key={m.id}>
                                                            <TableCell>{format(new Date(m.dateMovement), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell>{store?.name || '-'}</TableCell>
                                                            <TableCell>{product?.name || '-'}</TableCell>
                                                            <TableCell>
                                                                <span className={isEntry ? 'text-green-600' : 'text-orange-600'}>
                                                                    {isEntry ? 'Entrée' : 'Sortie'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                {agencyMovements.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                            Aucun mouvement enregistré
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
