import { useAuth } from "../context/AuthContext";

const Home = () => {

    const { user, logout } = useAuth();

    return (
        <div>
             
            <h1 className="text-5xl">This is my vision: An AI Assisted Accountability platform</h1>
            {user && (
                <>
                    <p className="text-6xl">Welcome, {user.full_name}</p>
                    <h1 className="text-2xl">I am so happy to have you here</h1>
                    <br />
                    <h1 className="text-3xl">Dealing with procrastination?</h1>
                    <h1 className="text-3xl font-bold">I have a solution</h1>
                </>
            )}
        </div>
    );
};

export default Home;