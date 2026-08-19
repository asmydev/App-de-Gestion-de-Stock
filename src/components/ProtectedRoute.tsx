import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
    const { isAuthenticated, selectedStore, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Admins don't need a selected store context
    if (user?.role !== 'admin' && !selectedStore) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
