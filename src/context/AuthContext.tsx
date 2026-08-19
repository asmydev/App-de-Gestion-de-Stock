import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { AppUser, Agency, Store } from "@/types";
import { toast } from "sonner";

interface AuthContextType {
    user: AppUser | null;
    selectedAgency: Agency | null;
    selectedStore: Store | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    setAgency: (agency: Agency) => void;
    setStore: (store: Store) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);

    // Persist session simply for MVP (User ID stored in localStorage)
    useEffect(() => {
        const storedUserId = localStorage.getItem("app_user_id");
        if (storedUserId) {
            fetchUser(storedUserId);
        }
    }, []);

    const fetchUser = async (id: string) => {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', id)
            .single();

        if (data && !error) {
            setUser({
                id: data.id,
                username: data.username,
                fullName: data.full_name,
                role: data.role,
                defaultAgencyId: data.default_agency_id,
                defaultStoreId: data.default_store_id
            });
        }
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            // Check user (Simple plain text password check as per "password_hash" in schema but implementing simple for now)
            // Ideally we use proper auth, but sticking to "custom login" requirement.
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .single();

            if (error || !data) {
                toast.error("Utilisateur introuvable");
                return false;
            }

            // Verify password (simplistic comparison, really should be hashed)
            // Assuming the field in DB is stored as plain text for this "MVP/Transformation" unless specified otherwise.
            if (data.password_hash !== password) {
                toast.error("Mot de passe incorrect");
                return false;
            }

            const appUser: AppUser = {
                id: data.id,
                username: data.username,
                fullName: data.full_name,
                role: data.role,
                defaultAgencyId: data.default_agency_id,
                defaultStoreId: data.default_store_id
            };

            setUser(appUser);
            localStorage.setItem("app_user_id", appUser.id);
            toast.success(`Bienvenue, ${appUser.fullName}`);
            return true;
        } catch (e) {
            console.error(e);
            toast.error("Erreur de connexion");
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setSelectedAgency(null);
        setSelectedStore(null);
        localStorage.removeItem("app_user_id");
        toast.info("Déconnexion réussie");
    };

    const setAgency = (agency: Agency) => {
        setSelectedAgency(agency);
        // Reset store if agency changes
        if (selectedStore && selectedStore.agencyId !== agency.id) {
            setSelectedStore(null);
        }
    };

    const setStore = (store: Store) => {
        setSelectedStore(store);
    };

    return (
        <AuthContext.Provider value={{
            user,
            selectedAgency,
            selectedStore,
            isAuthenticated: !!user,
            login,
            logout,
            setAgency,
            setStore
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
