import { useAuth } from "../context/AuthContext";

const Home = () => {

    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Home</h1>

            {user && (
                <>
                    <p>Welcome, {user.full_name}</p>
                    <p>{user.email}</p>

                    <button onClick={logout}>
                        Logout
                    </button>
                </>
            )}
        </div>
    );
};

export default Home;