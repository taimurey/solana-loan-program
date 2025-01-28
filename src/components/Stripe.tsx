// StripeModal.tsx
import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
// import CheckoutPage from "@/components/CheckoutPage";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import dynamic from 'next/dynamic'

const CheckoutPage = dynamic(() => import('@/components/CheckoutPage'), { ssr: false })

interface StripeModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  transactionId: string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const StripeModal: React.FC<StripeModalProps> = ({ isOpen, onClose, amount, transactionId }) => {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("StripeModal Props - Amount:", amount, "Transaction ID:", transactionId);

    if (!amount || !transactionId) {
      return;
    }

    const createPaymentIntent = async () => {
      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round(amount * 100) as number, transactionDocId: transactionId }),
        });

        const data = await res.json();

        if (res.ok) {
          setClientSecret(data.clientSecret);
        } else {
          console.log("Error creating PaymentIntent:", data);
          throw new Error(data.message || "Failed to create PaymentIntent.");
        }
      } catch (error: any) {
        console.error("Error creating PaymentIntent:", error);
        setErrorMessage(error.message || "An error occurred.");
      }
    };

    createPaymentIntent();
  }, [amount, transactionId]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-50"
          leave="ease-in duration-200"
          leaveFrom="opacity-50"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black opacity-50" />
        </Transition.Child>

        {/* Modal Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Close Button */}
                <div className="flex justify-end">
                  <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="mt-2">
                  <h2 className="text-xl font-bold mb-4">
                    {amount ? "Your" : "Guest"}'s Deposit
                  </h2>

                  <p className="mb-4">
                    Amount: <span className="font-semibold">${amount}</span>
                  </p>

                  {errorMessage && (
                    <div className="text-red-500 mb-4">{errorMessage}</div>
                  )}

                  {!clientSecret ? (
                    <div className="flex justify-center items-center">
                      <div
                        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent"
                        role="status"
                      >
                        <span className="sr-only">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutPage onSuccess={onClose} amount={amount} clientSecret={clientSecret} transactionID = {transactionId} />
                    </Elements>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default StripeModal;
