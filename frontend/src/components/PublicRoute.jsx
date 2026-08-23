import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {

    const { user, loading } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicRoute;