import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const HighStakePayment = ({ formData, onSuccess }) => {

    const { accessToken } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const confirmTask = async () => {

        setLoading(true);
        setError("");


        try {

            /* Create the task */

            const createResponse = await fetch(
                "http://localhost:8000/highstakes",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        description: formData.description || null,
                        deadline: formData.deadline,
                        stake_amount: Number(formData.stake_amount),
                        recipient_id: Number(formData.recipient_id)
                    })
                }
            );


            const createData = await createResponse.json();


            if (!createResponse.ok) {

                throw new Error(
                    createData.detail || "Failed to create high stake task."
                );

            }


            const taskId = createData.task_id;


            /* Initialize payment */

            const confirmResponse = await fetch(
                `http://localhost:8000/highstakes/${taskId}/confirm`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`
                    }
                }
            );


            const confirmData = await confirmResponse.json();


            if (!confirmResponse.ok) {

                throw new Error(
                    confirmData.detail || "Failed to initialize payment."
                );

            }


            /* Open Razorpay */

            const options = {

                key: import.meta.env.VITE_RAZORPAY_KEY_ID,

                amount: confirmData.amount,

                currency: confirmData.currency,

                name: "DeepWork",

                description: "High Stakes Commitment",

                order_id: confirmData.razorpay_order_id,


                handler: async function (response) {

                    try {

                        const verifyResponse = await fetch(
                            "http://localhost:8000/highstakes/payments/verify",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`
                                },
                                body: JSON.stringify({
                                    razorpay_payment_id:
                                        response.razorpay_payment_id,

                                    razorpay_order_id:
                                        response.razorpay_order_id,

                                    razorpay_signature:
                                        response.razorpay_signature
                                })
                            }
                        );


                        const verifyData = await verifyResponse.json();


                        if (!verifyResponse.ok) {

                            throw new Error(
                                verifyData.detail ||
                                "Payment verification failed."
                            );

                        }


                        console.log(
                            "Payment verified:",
                            verifyData
                        );


                        onSuccess();

                    } catch (error) {

                        console.error(error);

                        setError(error.message);

                    }

                },


                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }

            };


            const razorpay = new window.Razorpay(options);

            razorpay.open();


        } catch (error) {

            console.error(error);

            setError(error.message);

            setLoading(false);

        }

    };


    return (
        <div className="flex-1">

            <button
                type="button"
                onClick={confirmTask}
                disabled={loading}
                className="w-full rounded-lg bg-violet-600 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Opening Payment..." : "Confirm & Pay"}
            </button>


            {error && (
                <p className="mt-3 text-center text-sm text-red-400">
                    {error}
                </p>
            )}

        </div>
    );
};

export default HighStakePayment;