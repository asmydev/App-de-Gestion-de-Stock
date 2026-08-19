
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { Agency, Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Store as StoreIcon, Edit, Search } from "lucide-react";

// Color palette for agencies
const AGENCY_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-600' },
    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-600' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: 'text-purple-600' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-600' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', icon: 'text-pink-600' },
    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', icon: 'text-teal-600' },
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'text-indigo-600' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'text-cyan-600' },
];

export default function Stores() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState("");
    const [selectedAgencyId, setSelectedAgencyId] = useState("");

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [editStoreName, setEditStoreName] = useState("");

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: agenciesData } = await supabase.from('agencies').select('*').order('name');
        const { data: storesData } = await supabase.from('stores').select('*').order('name');

        if (agenciesData) setAgencies(agenciesData);
        if (storesData) {
            // Map snake_case to camelCase
            const mappedStores: Store[] = storesData.map((s: any) => ({
                id: s.id,
                agencyId: s.agency_id,
                name: s.name,
                createdAt: s.created_at
            }));
            setStores(mappedStores);
        }
        setLoading(false);
    };

    const handleAddStore = async () => {
        if (!newStoreName || !selectedAgencyId) {
            toast.error("Veuillez remplir tous les champs");
            return;
        }

        // Check if store with same name already exists in this agency
        const existingStore = stores.find(
            s => s.name.toLowerCase().trim() === newStoreName.toLowerCase().trim() && s.agencyId === selectedAgencyId
        );
        if (existingStore) {
            toast.error("Un magasin avec ce nom existe déjà dans cette agence");
            return;
        }

        const { data, error } = await supabase
            .from('stores')
            .insert([{ name: newStoreName.trim(), agency_id: selectedAgencyId }])
            .select()
            .single();

        if (error) {
            toast.error("Erreur lors de la création du magasin");
            console.error(error);
        } else {
            toast.success("Magasin créé avec succès");
            setStores([...stores, {
                id: data.id,
                agencyId: data.agency_id,
                name: data.name,
                createdAt: data.created_at
            }]);
            setIsAddOpen(false);
            setNewStoreName("");
            setSelectedAgencyId("");
        }
    };

    const handleDeleteStore = async (id: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce magasin ? Cette action est irréversible.")) return;

        const { error } = await supabase.from('stores').delete().eq('id', id);

        if (error) {
            toast.error("Erreur lors de la suppression");
        } else {
            toast.success("Magasin supprimé");
            setStores(stores.filter(s => s.id !== id));
        }
    };

    const handleOpenEdit = (store: Store) => {
        setEditingStore(store);
        setEditStoreName(store.name);
        setIsEditOpen(true);
    };

    const handleEditStore = async () => {
        if (!editingStore || !editStoreName) {
            toast.error("Veuillez entrer un nom");
            return;
        }

        // Check if another store with same name exists in same agency (excluding current store)
        const existingStore = stores.find(
            s => s.name.toLowerCase().trim() === editStoreName.toLowerCase().trim()
                && s.agencyId === editingStore.agencyId
                && s.id !== editingStore.id
        );
        if (existingStore) {
            toast.error("Un magasin avec ce nom existe déjà dans cette agence");
            return;
        }

        const { error } = await supabase
            .from('stores')
            .update({ name: editStoreName.trim() })
            .eq('id', editingStore.id);

        if (error) {
            toast.error("Erreur lors de la modification");
            console.error(error);
        } else {
            toast.success("Magasin modifié avec succès");
            setStores(stores.map(s => s.id === editingStore.id ? { ...s, name: editStoreName.trim() } : s));
            setIsEditOpen(false);
            setEditingStore(null);
            setEditStoreName("");
        }
    };

    // Filter agencies & stores based on search query
    const filteredAgencies = agencies.filter(agency => {
        const agencyStores = stores.filter(s => s.agencyId === agency.id);
        const matchesAgency = agency.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStore = agencyStores.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesAgency || matchesStore;
    });

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestion des Magasins</h1>
                        <p className="text-muted-foreground">Ajoutez et gérez les magasins par agence.</p>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700">
                                <Plus className="mr-2 h-4 w-4" /> Nouveau Magasin
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ajouter un Magasin</DialogTitle>
                                <DialogDescription>Associez un nouveau magasin à une agence existante.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nom du Magasin</Label>
                                    <Input
                                        placeholder="Ex: Magasin Principal"
                                        value={newStoreName}
                                        onChange={(e) => setNewStoreName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Agence</Label>
                                    <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir une agence" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agencies.map(agency => (
                                                <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                                <Button onClick={handleAddStore}>Créer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Global Counter + Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{agencies.length} Agences</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100">
                            <StoreIcon className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-700">{stores.length} Magasins</span>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher agence ou magasin..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAgencies.map((agency, index) => {
                        const agencyStores = stores.filter(s => s.agencyId === agency.id);
                        return (
                            <Card key={agency.id} className={`flex flex-col border-t-4 ${AGENCY_COLORS[index % AGENCY_COLORS.length].border}`}>
                                <CardHeader className={`${AGENCY_COLORS[index % AGENCY_COLORS.length].bg} pb-4 rounded-t-sm`}>
                                    <CardTitle className={`flex items-center gap-2 text-lg ${AGENCY_COLORS[index % AGENCY_COLORS.length].text}`}>
                                        <Building2 className={`h-5 w-5 ${AGENCY_COLORS[index % AGENCY_COLORS.length].icon}`} />
                                        {agency.name}
                                    </CardTitle>
                                    <CardDescription>{agencyStores.length} magasin(s)</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 pt-4">
                                    {agencyStores.length > 0 ? (
                                        <div className="space-y-2">
                                            {agencyStores.map(store => (
                                                <div key={store.id} className="flex items-center justify-between p-2 rounded-md bg-background border group hover:border-primary/50 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{store.name}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            onClick={() => handleOpenEdit(store)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteStore(store.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-20 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-md">
                                            Aucun magasin
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Edit Store Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier le Magasin</DialogTitle>
                            <DialogDescription>Modifiez le nom du magasin.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nom du Magasin</Label>
                                <Input
                                    placeholder="Ex: Magasin Principal"
                                    value={editStoreName}
                                    onChange={(e) => setEditStoreName(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
                            <Button onClick={handleEditStore}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
