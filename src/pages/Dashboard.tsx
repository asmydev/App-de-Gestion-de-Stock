
import { useAppStore } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Package } from "lucide-react";

const Dashboard = () => {
    const { movements, products } = useAppStore();
    const { selectedAgency } = useAuth();

    // Stats Calculation
    const exits = movements.filter(m => m.movementType === 'EXIT');
    const entries = movements.filter(m => m.movementType === 'ENTRY' || m.movementType === 'RETURN');

    const totalExitsCount = exits.reduce((sum, m) => sum + Number(m.quantity), 0);
    const totalEntriesCount = entries.reduce((sum, m) => sum + Number(m.quantity), 0);
    const transactionsCount = movements.length;

    // Top Products Sold (Volume) - Only products with movements
    const productStats = products.map(prod => {
        const sales = exits.filter(m => m.productId === prod.id);
        const qty = sales.reduce((sum, s) => sum + Number(s.quantity), 0);
        return {
            name: prod.name,
            quantity: qty
        };
    }).filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    return (
        <AppLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de bord - Agence {selectedAgency?.name}</h1>
                    <p className="text-muted-foreground">Vue d'ensemble des mouvements de stock de l'agence.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Volume Sorties</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalExitsCount}</div>
                            <p className="text-xs text-muted-foreground">Unités sorties (Ventes/Sorties)</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Volume Entrées</CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalEntriesCount}</div>
                            <p className="text-xs text-muted-foreground">Unités reçues</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Produits Référencés</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{products.length}</div>
                            <p className="text-xs text-muted-foreground">Dans cette agence</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts & Top Lists */}
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                    {/* Main Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Sorties (Quantité)</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={productStats}>
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
                                        formatter={(value: number) => [`${value}`, "Quantité"]}
                                        labelFormatter={(label) => `${label}`}
                                        labelStyle={{ color: "black" }}
                                    />
                                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Top Products List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Détail Top Sorties</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Produits avec le plus grand volume de sortie
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {productStats.map((prod, i) => (
                                    <div key={prod.name} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{prod.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {prod.quantity} sorties
                                            </p>
                                        </div>
                                        <div className="ml-auto font-bold opacity-80">#{i + 1}</div>
                                    </div>
                                ))}
                                {productStats.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;
