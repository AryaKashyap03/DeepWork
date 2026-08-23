import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);


    const login = async (token) => {
        setAccessToken(token);

        const response = await fetch("http://localhost:8000/profile", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setAccessToken(null);
            setUser(null);
            return false;
        }

        const userData = await response.json();
        setUser(userData);

        return true;
    };

    const logout = async () => {
        try {
            await fetch("http://localhost:8000/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }

        setAccessToken(null);
        setUser(null);
    };
    
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const response = await fetch(
                    "http://localhost:8000/auth/refresh",
                    {
                        method: "POST",
                        credentials: "include",
                    }
                );

                if (!response.ok) {
                    setLoading(false);
                    return;
                }

                const data = await response.json();

                await login(data.access_token);
            } catch (error) {
                console.error("Failed to restore session:", error);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);
    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                login,
                logout,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}