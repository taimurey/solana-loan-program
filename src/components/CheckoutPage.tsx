"use client";

import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface CheckoutPageProps {
    onSuccess: () => void;
    amount: number;
    clientSecret: string;
    transactionID: string;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ onSuccess, amount, clientSecret, transactionID }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const router = useRouter();


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        if (!stripe || !elements) {
            return;
        }

        const { error: submitError } = await elements.submit();

        if (submitError) {
            setErrorMessage(submitError.message || "An unknown error occurred.");
            setLoading(false);
            return;
        }

        const { error } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {

                return_url: `${window.location.origin}/payment-success?amount=${amount}&transactionID=${transactionID}`,

            },
        });

        if (error) {
            // This point is only reached if there's an immediate error when
            // confirming the payment. Show the error to your customer (for example, payment details incomplete)
            setErrorMessage(error.message || "An unknown error occurred.");
        } else {
            // The payment UI automatically closes with a success animation.
            // Your customer is redirected to your `return_url`.
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-md shadow-md">
            <PaymentElement />
            {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
            <button
                type="submit"
                disabled={!stripe || !elements || loading}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {!loading ? `Pay Now $${amount}` : "Processing..."}
            </button>
        </form>
    );
};

export default CheckoutPage;
