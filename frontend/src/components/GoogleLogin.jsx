import { useEffect, useRef } from "react";

function GoogleLogin() {
    const googleButtonRef = useRef(null);

    useEffect(() => {
        if (!window.google) {
            console.error("Google Identity Services library not loaded");
            return;
        }

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,

            callback: async (response) => {
                console.log("Google response:", response);

                const result = await fetch("http://localhost:8000/auth/google", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                });

                const data = await result.json();

                console.log("Backend response:", data);
                if (result.ok) {
                    console.log("Google login successful!");
                }
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