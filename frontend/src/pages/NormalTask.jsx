import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NormalTask = () => {

    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        deadline: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");


        try {

            const response = await fetch(
                "http://localhost:8000/tasks",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        description: formData.description || null,
                        deadline: formData.deadline
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail || "Failed to create task."
                );

            }


            navigate("/dashboard");

        } catch (error) {

            console.error(error);
            setError(error.message);

        } finally {

            setLoading(false);

        }

    };


    return (
        <main className="min-h-screen bg-[#18181b] px-4 py-8 text-white sm:px-6">

            <div className="mx-auto max-w-3xl">

                <button
                    onClick={() => navigate("/dashboard")}
                    className="mb-6 text-sm text-gray-400 transition hover:text-white"
                >
                    ← Back to Dashboard
                </button>


                <div>

                    <h1 className="text-3xl font-bold">
                        Create Normal Task
                    </h1>

                    <p className="mt-2 text-sm text-gray-400">
                        Set a goal, give yourself a deadline, and get it done.
                    </p>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8"
                >

                    {/* Title */}

                    <div>

                        <label className="text-sm font-medium">
                            Task Title
                        </label>

                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Complete 3 DSA problems"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Description */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Task Description
                        </label>

                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="What exactly do you want to achieve?"
                            rows="5"
                            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Deadline */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Deadline
                        </label>

                        <input
                            type="datetime-local"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleChange}
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* XP information */}

                    <div className="mt-6 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">

                        <p className="text-sm text-violet-300">
                            ✦ Stay on track to protect your XP.
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                            Completing your task keeps your progress intact.
                            Missing the deadline will result in a small XP penalty.
                        </p>

                    </div>


                    {error && (
                        <p className="mt-5 text-sm text-red-400">
                            {error}
                        </p>
                    )}


                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Creating Task..." : "Create Task"}
                    </button>

                </form>

            </div>

        </main>
    );
};

export default NormalTask;