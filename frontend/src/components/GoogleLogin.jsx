import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

function GoogleLogin() {
    const googleButtonRef = useRef(null);
    const { login } = useAuth();

    useEffect(() => {
        if (!window.google) {
            console.error("Google Identity Services library not loaded");
            return;
        }

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,

            callback: async (response) => {
                const result = await fetch("http://localhost:8000/auth/google", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                });

                const data = await result.json();

                if (!result.ok) {
                    console.error("Google login failed:", data);
                    return;
                }

                await login(data.access_token);

                console.log("Google login successful!");
            },
        });

        window.google.accounts.id.renderButton(
            googleButtonRef.current,
            {
                theme: "outline",
                size: "large",
                text: "continue_with",
                shape: "rectangular",
            }
        );
    }, []);

    return <div ref={googleButtonRef}></div>;
}

export default GoogleLogin;