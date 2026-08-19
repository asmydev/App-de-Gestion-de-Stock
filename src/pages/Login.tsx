import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Agency, Store } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { login, logout, isAuthenticated, user, setAgency, setStore, selectedAgency, selectedStore } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Context Selection State
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'admin') {
                navigate("/admin");
            } else if (selectedAgency && selectedStore) {
                navigate("/dashboard");
            } else {
                fetchAgencies();
            }
        }
    }, [isAuthenticated, user, selectedAgency, selectedStore, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await login(username, password);
        setIsLoading(false);
        if (success) {
            // After successful login, the effect above will trigger fetching agencies
        }
    };

    const fetchAgencies = async () => {
        const { data, error } = await supabase.from('agencies').select('*');
        if (error) {
            toast.error("Erreur chargement agences");
        } else {
            setAgencies(data || []);
            // Pre-select if user has default
            if (user?.defaultAgencyId) {
                const defaultAg = data?.find(a => a.id === user.defaultAgencyId);
                if (defaultAg) handleAgencySelect(defaultAg.id.toString());
            }
        }
    };

    const handleAgencySelect = async (agencyId: string) => {
        const agency = agencies.find(a => a.id === agencyId);
        if (agency) {
            setAgency(agency);
            // Fetch stores for this agency
            const { data, error } = await supabase.from('stores').select('*').eq('agency_id', agencyId);
            if (error) {
                toast.error("Erreur chargement magasins");
            } else {
                setStores(data || []);
                // Pre-select if user has default
                if (user?.defaultStoreId) {
                    const defaultSt = data?.find(s => s.id === user.defaultStoreId);
                    if (defaultSt) setStore(defaultSt);
                }
            }
        }
    };

    const handleStoreSelect = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (store) {
            setStore(store);
            toast.success(`Magasin ${store.name} sélectionné`);
            navigate("/dashboard");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 relative overflow-hidden">
                {/* GV Watermark */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <span className="text-[25rem] font-black select-none" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(22,163,74,0.03) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'blur(1px)' }}>GV</span>
                </div>
                <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-500 relative z-10">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-3">
                            <img src="/favicon.png" alt="Logo" className="h-20 w-20 mx-auto" />
                        </div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-500 bg-clip-text text-transparent">Green Stock</CardTitle>
                        <CardDescription>Connexion Gestion de Stock</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Nom d'utilisateur</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                                {isLoading ? "Connexion..." : "Se connecter"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <div className="absolute bottom-4 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} <span className="font-semibold text-green-600">Green Stock</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 relative overflow-hidden">
            {/* GV Watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-[25rem] font-black select-none" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(22,163,74,0.03) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'blur(1px)' }}>GV</span>
            </div>
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-500 relative z-10">
                <CardHeader>
                    <CardTitle className="text-xl text-center">Sélection du Magasin</CardTitle>
                    <CardDescription className="text-center">
                        Veuillez choisir votre espace de travail
                        <br />
                        <span
                            onClick={logout}
                            className="text-xs text-red-600 cursor-pointer hover:underline mt-2 inline-block"
                        >
                            Pas vous ? Se déconnecter
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Agence</Label>
                        <Select onValueChange={handleAgencySelect} defaultValue={user?.defaultAgencyId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir une agence" />
                            </SelectTrigger>
                            <SelectContent>
                                {agencies.map((agency) => (
                                    <SelectItem key={agency.id} value={agency.id}>
                                        {agency.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAgency && (
                        <div className="space-y-2">
                            <Label>Magasin</Label>
                            <Select onValueChange={handleStoreSelect} defaultValue={user?.defaultStoreId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un magasin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map((store) => (
                                        <SelectItem key={store.id} value={store.id}>
                                            {store.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="absolute bottom-4 text-xs text-muted-foreground">
                © {new Date().getFullYear()} <span className="font-semibold text-green-600">Green Stock</span>
            </div>
        </div>
    );
}
