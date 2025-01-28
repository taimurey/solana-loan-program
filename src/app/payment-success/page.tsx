"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseconfig"; // Ensure Firebase is initialized correctly
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

export default function PaymentSuccess() {
    const searchParams = useSearchParams();
    const amountParam = searchParams.get("amount");
    const transactionID = searchParams.get("transactionID");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    useEffect(() => {
        const updateTransaction = async () => {
            if (!transactionID || !amountParam) {
                setError("Missing transaction ID or amount.");
                return;
            }

            // Parse the deposited amount
            const newAmount = parseFloat(amountParam);
            if (isNaN(newAmount) || newAmount <= 0) {
                setError("Invalid deposit amount.");
                return;
            }

            try {
                // Reference to the specific document in Firestore
                const transactionRef = doc(db, "transactions", transactionID);

                // Fetch the existing transaction document
                const transactionSnap = await getDoc(transactionRef);

                if (!transactionSnap.exists()) {
                    setError("Transaction does not exist.");
                    return;
                }

                const transactionData = transactionSnap.data();

                // Parse the existing amount
                const existingAmount = parseFloat(transactionData.amount || "0");
                if (isNaN(existingAmount)) {
                    setError("Existing transaction amount is invalid.");
                    return;
                }

                // Calculate the new total amount
                const updatedAmount = existingAmount + newAmount;

                // Update the transaction document
                await updateDoc(transactionRef, {
                    amount: updatedAmount.toString(),
                    depositedState: "deposited",
                });

                toast.success("Transaction updated successfully!");
                setSuccess(true);
            } catch (err) {
                console.error("Error updating transaction:", err);
                setError("Failed to update transaction. Please contact support.");
            }
        };

        updateTransaction();
    }, [transactionID, amountParam]);

    if (error) {
        return (
            <main className="max-w-6xl mx-auto p-10 text-white text-center border m-10 rounded-md bg-gradient-to-tr from-red-500 to-pink-500">
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold mb-2">Payment Failed</h1>
                    <h2 className="text-2xl">{error}</h2>
                </div>
            </main>
        );
    }

    if (success) {
        return (
            <main className="max-w-6xl mx-auto p-10 text-white text-center border m-10 rounded-md bg-gradient-to-tr from-green-500 to-teal-500">
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold mb-2">Thank You!</h1>
                    <h2 className="text-2xl">Your payment was successful.</h2>

                    <div className="bg-white p-2 rounded-md text-green-500 mt-5 text-4xl font-bold">
                        {amountParam}
                    </div>
                </div>
            </main>
        );
    }

    // While updating
    return (
        <main className="max-w-6xl mx-auto p-10 text-white text-center border m-10 rounded-md bg-gradient-to-tr from-blue-500 to-purple-500">
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold mb-2">Processing Your Payment...</h1>
                <h2 className="text-2xl">Please wait a moment.</h2>
            </div>
        </main>
    );
}
