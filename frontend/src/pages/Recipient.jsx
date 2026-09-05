import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Recipient = () => {

    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        razorpay_contact_id: "",
        razorpay_fund_account_id: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


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
        setSuccess("");


        try {

            const response = await fetch(
                "http://localhost:8000/highstakes/recipient",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(formData)
                }
            );


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail || "Failed to create recipient."
                );

            }


            setSuccess("Recipient added successfully.");


            setFormData({
                name: "",
                email: "",
                phone: "",
                razorpay_contact_id: "",
                razorpay_fund_account_id: ""
            });
            
            navigate("/tasks/new/high-stake");

        } catch (error) {

            console.error(error);
            setError(error.message);

        } finally {

            setLoading(false);

        }

    };


    return (
        <main className="min-h-screen bg-[#18181b] px-4 py-8 text-white sm:px-6">

            <div className="mx-auto max-w-2xl">

                <button
                    onClick={() => navigate("/dashboard")}
                    className="mb-6 text-sm text-gray-400 transition hover:text-white"
                >
                    ← Back to Dashboard
                </button>


                <div>
                    <h1 className="text-3xl font-bold">
                        Recipients
                    </h1>

                    <p className="mt-2 text-sm text-gray-400">
                        Add people or organizations that can receive your
                        high stake commitments.
                    </p>
                </div>


                <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8"
                >

                    {/* Name */}

                    <div>

                        <label className="text-sm font-medium">
                            Name
                        </label>

                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Rahul Sharma"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Email */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Email
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="rahul@example.com"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Phone */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Phone
                        </label>

                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="9876543210"
                            minLength="10"
                            maxLength="15"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Razorpay Contact ID */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Razorpay Contact ID
                        </label>

                        <input
                            type="text"
                            name="razorpay_contact_id"
                            value={formData.razorpay_contact_id}
                            onChange={handleChange}
                            placeholder="cont_xxxxxxxxxxxxx"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {/* Razorpay Fund Account ID */}

                    <div className="mt-6">

                        <label className="text-sm font-medium">
                            Razorpay Fund Account ID
                        </label>

                        <input
                            type="text"
                            name="razorpay_fund_account_id"
                            value={formData.razorpay_fund_account_id}
                            onChange={handleChange}
                            placeholder="fa_xxxxxxxxxxxxx"
                            required
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                        />

                    </div>


                    {error && (
                        <p className="mt-5 text-sm text-red-400">
                            {error}
                        </p>
                    )}


                    {success && (
                        <p className="mt-5 text-sm text-green-400">
                            {success}
                        </p>
                    )}


                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Adding Recipient..." : "Add Recipient"}
                    </button>

                </form>

            </div>

        </main>
    );
};

export default Recipient;