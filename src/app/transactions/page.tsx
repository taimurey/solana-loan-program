"use client";

import React, { useState, ChangeEvent } from "react";
import { useGlobalContext } from "@/context/Globalcontext";
import SecondaryLayout from "@/components/SecondaryLayout";
import { doc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";

import Drawer from "@/components/Drawer";
import { FaEllipsisH, FaEdit, FaTrash, FaPlay } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "@/utils/firebaseconfig"; // <-- import the Firestore instance from your firebase.ts


interface Transaction {
  docId?: string;            // Firestore document ID
  poolDocId: string;         // The pool docId to link this transaction to a pool
  poolName: string;          // For display
  transactionDate: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  streetLine1: string;
  streetLine2: string;
  zipCode: string;
  city: string;
  region: string;
  country: string;
  contractTerms: string;
  depositedState: string;
  amount: string;
  tokenAddress: string;
}

interface InputFieldProps {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type, placeholder, value, onChange }) => (
  <div className="mb-2">
    <label className="block text-gray-700 font-semibold mb-1" htmlFor={name}>{label}</label>
    <input id={name} name={name} type={type} placeholder={placeholder} value={value} onChange={onChange} className="w-full p-2 border rounded" />
  </div>
);
const Page = () => {
  const { user, allTransactions, setAllTransactions } = useGlobalContext();


  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [isdepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<"solana" | "stripe">("solana");
  const [tobeDepositedTransaction, setTobeDepositedTransaction] = useState<Transaction | null>(null);

  const [transactionDetails, setTransactionDetails] = useState<Transaction>({
    poolName: "",
    transactionDate: new Date().toISOString().split("T")[0], // Default to today's date
    fullName: "",
    email: "",
    phoneNumber: "",
    streetLine1: "",
    streetLine2: "",
    zipCode: "",
    city: "",
    region: "",
    country: "",
    contractTerms: "",
    depositedState: "",
    amount: "",
    tokenAddress: "",
    poolDocId: "",

  });
  const handleDepositViaSolana = async () => {
    if (!transactionDetails.tokenAddress || !transactionDetails.amount) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (tobeDepositedTransaction) {
      // Create an updated transaction in local state
      const updatedTransaction = {
        ...tobeDepositedTransaction,
        amount: transactionDetails.amount,
        depositedState: "deposited",
      };

      // Update the global state
      const updatedTransactions = allTransactions.map((t) =>
        t.docId === tobeDepositedTransaction.docId ? updatedTransaction : t
      );
      setAllTransactions(updatedTransactions);

      // 1) Update Firestore if we have a docId
      if (tobeDepositedTransaction.docId) {
        try {
          await updateDoc(
            doc(db, "transactions", tobeDepositedTransaction.docId),
            {
              amount: transactionDetails.amount,
              depositedState: "deposited",
            }
          );
        } catch (error) {
          console.error("Error updating transaction in Firestore:", error);
          toast.error("Could not update transaction in Firestore");
        }
      }

      // Clear the active transaction
      setTobeDepositedTransaction(null);
    }

    setIsDepositDrawerOpen(false);
    toast.success("Deposit via Solana successful!");
  };


  const handleDepositViaStripe = async (amount: number) => {
    if (tobeDepositedTransaction) {
      // Create an updated transaction in local state
      const updatedTransaction = {
        ...tobeDepositedTransaction,
        amount: amount.toString(),
        depositedState: "deposited",
      };

      // Update the global state
      const updatedTransactions = allTransactions.map((t) =>
        t.docId === tobeDepositedTransaction.docId ? updatedTransaction : t
      );
      setAllTransactions(updatedTransactions);

      // Firestore update
      if (tobeDepositedTransaction.docId) {
        try {
          await updateDoc(doc(db, "transactions", tobeDepositedTransaction.docId), {
            amount: amount.toString(),
            depositedState: "deposited",
          });
        } catch (error) {
          console.error("Error updating transaction in Firestore:", error);
          toast.error("Could not update transaction in Firestore");
        }
      }

      // Clear the active transaction
      setTobeDepositedTransaction(null);
    }

    setIsDepositDrawerOpen(false);
    toast.success(`Deposit of $${amount} via Stripe successful!`);
  };

  const handleTransactionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransactionDetails((prev) => ({ ...prev, [name]: value }));
  };


  const handleDelete = async (docId: string | undefined) => {

    try {
      if (!docId) {
        toast.error("No docId found. Can't delete from Firestore.");
        return;
      }

      await deleteDoc(doc(db, "transactions", docId));

      const transaction = allTransactions.filter((transaction) => transaction.docId !== docId);
      setAllTransactions(transaction);
      setMenuOpenIndex(null);
      toast.info("Transaction deleted successfully!");

    } catch (error) {
      console.error("Error deletinG transactions:", error);
      toast.error("Error deleting transactions from Firestore");
    }
  };


  const handleWithDraw = (index: number) => {
    setMenuOpenIndex(null);
    toast.success("Transaction withdrawed succesfully! ");
  };
  const handleCloseDepositDrawer = () => {
    setIsDepositDrawerOpen(false);
    setTobeDepositedTransaction(null); // Clear the active transaction
  };

  return (
    user && (
      <SecondaryLayout title={`Welcome back, ${user.name}`} description="This is your Transactions overview portal.">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold text-black/90">All Transactions</h1>
          </div>

          <table className="w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Pool Name</th>
                <th className="p-3 text-left">Transaction Date</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">User Name</th>
                <th className="p-3 text-left">Deposited State</th>
                <th className="p-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((transaction, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3">{transaction.poolName}</td>
                  <td className="p-3">{transaction.transactionDate}</td>
                  <td className="p-3">${transaction.amount}</td>
                  <td className="p-3">{transaction.fullName}</td>
                  <td className="p-3">{transaction.depositedState}</td>
                  <td className="p-3 relative">
                    <div className="relative group inline-block">
                      <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-300  " onClick={() => setMenuOpenIndex(menuOpenIndex === index ? null : index)}>
                        <FaEllipsisH />
                      </button>
                      {menuOpenIndex === index && (
                        <div className="absolute right-4 mt-2 w-40 bg-white shadow-lg rounded-lg z-50  transition-opacity duration-200">
                          {/* <button onClick={() => handleEdit(index)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaEdit className="mx-2" /> Edit</button> */}
                          <button onClick={() => handleDelete(transaction.docId)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaTrash className="mx-2" /> Delete</button>
                          <button onClick={() => handleWithDraw(index)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaPlay className="mx-2" />WithDraw</button>
                          <button onClick={() => { setIsDepositDrawerOpen(true); setTobeDepositedTransaction(transaction); setMenuOpenIndex(null) }} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaPlay className="mx-2" />Deposit</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isdepositDrawerOpen && (
            <Drawer onClose={handleCloseDepositDrawer}>
              <div className="mb-2">
                <h2 className="text-xl font-semibold">Deposit to Pool</h2>
                <p className="text-sm py-1 text-black/70">Read the instructions carefully</p>
              </div>

              {/* Deposit Method Selection */}
              <div className="flex gap-2 mb-4 w-full">
                <button
                  className={`p-2 rounded text-white w-full ${selectedDepositMethod === "solana" ? "bg-black" : "bg-black/80"}`}
                  onClick={() => setSelectedDepositMethod("solana")}
                >
                  USDC (Solana)
                </button>
                <button
                  className={`p-2 text-white rounded w-full ${selectedDepositMethod === "stripe" ? "bg-black" : "bg-black/80"}`}
                  onClick={() => setSelectedDepositMethod("stripe")}
                >
                  ACH (Stripe)
                </button>
              </div>

              {/* Solana Deposit Section */}
              {selectedDepositMethod === "solana" && (
                <>
                  <InputField
                    label="Deposit USDC to this address"
                    name="tokenAddress"
                    type="text"
                    placeholder="fsurfy734fu3f3y74few349"
                    value={transactionDetails.tokenAddress}
                    onChange={handleTransactionInputChange}
                  />
                  <InputField
                    label="Deposited Amount"
                    name="amount"
                    type="number"
                    placeholder="Amount"
                    value={transactionDetails.amount}
                    onChange={handleTransactionInputChange}
                  />
                  <button
                    className="w-full bg-black text-white py-2 rounded"
                    onClick={handleDepositViaSolana}
                  >
                    Deposit via Solana
                  </button>
                </>
              )}

              {/* Stripe Deposit Section */}
              {selectedDepositMethod === "stripe" && (
                <>
                  <p className="text-sm text-gray-600 mb-2">Select deposit via ACH</p>
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">Important:</span> When you deposit, please confirm if you use your account email, or your funds will be lost.
                  </p>

                  {/* Deposit Amount Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(100)}
                    >
                      $100
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(200)}
                    >
                      $200
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(500)}
                    >
                      $500
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(1000)}
                    >
                      $1000
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(2000)}
                    >
                      $2000
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(5000)}
                    >
                      $5000
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(10000)}
                    >
                      $10000
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(20000)}
                    >
                      $20000
                    </button>
                    <button
                      className="w-full bg-black text-white py-2 rounded"
                      onClick={() => handleDepositViaStripe(50000)}
                    >
                      $50000
                    </button>
                  </div>
                </>
              )}
            </Drawer>
          )}
        </div>
      </SecondaryLayout>
    )
  );
};

export default Page;