import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HighStakePayment from "../components/HighStakePayment";

const HighStake = () => {

    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [recipients, setRecipients] = useState([]);
    const [loadingRecipients, setLoadingRecipients] = useState(true);
    const [reviewing, setReviewing] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        deadline: "",
        stake_amount: "",
        recipient_id: ""
    });


    useEffect(() => {

        const fetchRecipients = async () => {

            try {

                const response = await fetch(
                    "http://localhost:8000/highstakes/recipients",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    console.error(data);
                    return;
                }

                setRecipients(data);

            } catch (error) {
                console.error("Failed to fetch recipients:", error);
            } finally {
                setLoadingRecipients(false);
            }
        };

        fetchRecipients();

    }, [accessToken]);


    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };


    const handleReview = (e) => {

        e.preventDefault();
        setReviewing(true);

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


                <h1 className="text-3xl font-bold">
                    Create High Stake Task
                </h1>

                <p className="mt-2 text-sm text-gray-400">
                    Define your commitment. Stay accountable.
                </p>


                {!reviewing ? (

                    /* ================= FORM ================= */

                    <form
                        onSubmit={handleReview}
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
                                placeholder="e.g. Complete 5 DSA problems"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                                required
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
                                rows="4"
                                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                            />

                        </div>


                        {/* Deadline + Stake */}

                        <div className="mt-6 grid gap-5 sm:grid-cols-2">

                            <div>

                                <label className="text-sm font-medium">
                                    Deadline
                                </label>

                                <input
                                    type="datetime-local"
                                    name="deadline"
                                    value={formData.deadline}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                                    required
                                />

                            </div>


                            <div>

                                <label className="text-sm font-medium">
                                    Stake Amount
                                </label>

                                <div className="relative mt-2">

                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        ₹
                                    </span>

                                    <input
                                        type="number"
                                        name="stake_amount"
                                        value={formData.stake_amount}
                                        onChange={handleChange}
                                        min="50"
                                        max="1000"
                                        placeholder="500"
                                        className="w-full rounded-lg border border-white/10 bg-[#18181b] py-3 pl-8 pr-4 text-sm outline-none transition focus:border-violet-500"
                                        required
                                    />

                                </div>

                                <p className="mt-1 text-xs text-gray-500">
                                    Minimum ₹50 · Maximum ₹1,000
                                </p>

                            </div>

                        </div>


                        {/* Recipient */}

                        <div className="mt-6">

                            <div className="flex items-center justify-between">

                                <label className="text-sm font-medium">
                                    Recipient
                                </label>

                                <button
                                    type="button"
                                    onClick={() => navigate("/recipients")}
                                    className="text-xs text-violet-400 hover:text-violet-300"
                                >
                                    + Add recipient
                                </button>

                            </div>


                            {loadingRecipients ? (

                                <div className="mt-2 rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm text-gray-500">
                                    Loading recipients...
                                </div>

                            ) : recipients.length === 0 ? (

                                <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">

                                    <p className="text-sm text-yellow-300">
                                        You need to create a recipient before creating a high stake task.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => navigate("/recipients")}
                                        className="mt-3 text-sm font-medium text-violet-400 hover:text-violet-300"
                                    >
                                        Create a recipient →
                                    </button>

                                </div>

                            ) : (

                                <select
                                    name="recipient_id"
                                    value={formData.recipient_id}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181b] px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                                    required
                                >

                                    <option value="">
                                        Select a recipient
                                    </option>

                                    {recipients.map((recipient) => (

                                        <option
                                            key={recipient.id}
                                            value={recipient.id}
                                        >
                                            {recipient.name}
                                        </option>

                                    ))}

                                </select>

                            )}

                        </div>


                        {/* Warning */}

                        <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm leading-6 text-yellow-300">
                            ⚠ If you fail to complete this task before the
                            deadline, your stake will be sent to the selected
                            recipient.
                        </div>


                        <button
                            type="submit"
                            disabled={recipients.length === 0}
                            className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Review & Confirm
                        </button>

                    </form>

                ) : (

                    /* ================= REVIEW ================= */

                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">

                        <p className="text-sm font-medium uppercase tracking-wider text-violet-400">
                            Review
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            Review your commitment
                        </h2>

                        <p className="mt-2 text-sm text-gray-400">
                            Make sure everything looks right before you confirm.
                        </p>


                        {/* Task details */}

                        <div className="mt-8 rounded-xl border border-white/10 bg-[#18181b] p-5">

                            <p className="text-xs uppercase tracking-wider text-gray-500">
                                Task
                            </p>

                            <h3 className="mt-2 text-xl font-semibold">
                                {formData.title}
                            </h3>


                            {formData.description && (
                                <p className="mt-3 text-sm leading-6 text-gray-400">
                                    {formData.description}
                                </p>
                            )}


                            <div className="mt-6 grid gap-5 sm:grid-cols-3">

                                <div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Deadline
                                    </p>

                                    <p className="mt-1 text-sm">
                                        {new Date(formData.deadline).toLocaleString()}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Stake
                                    </p>

                                    <p className="mt-1 text-lg font-semibold text-violet-400">
                                        ₹{formData.stake_amount}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Recipient
                                    </p>

                                    <p className="mt-1 text-sm">
                                        {
                                            recipients.find(
                                                (recipient) =>
                                                    recipient.id === Number(formData.recipient_id)
                                            )?.name
                                        }
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Payment warning */}

                        <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm leading-6 text-yellow-300">

                            ⚠ By confirming, you are committing ₹
                            {formData.stake_amount}.

                            If you fail to complete this task before the
                            deadline, the stake will be sent to the selected
                            recipient.

                        </div>


                        {/* Actions */}

                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">

                            <button
                                type="button"
                                onClick={() => setReviewing(false)}
                                className="flex-1 rounded-lg border border-white/10 py-3 text-sm font-medium transition hover:bg-white/5"
                            >
                                ← Back & Edit
                            </button>


                            <HighStakePayment
                                formData={formData}
                                onSuccess={() => navigate("/dashboard")}
                            />

                        </div>

                    </div>

                )}

            </div>

        </main>
    );
};

export default HighStake;