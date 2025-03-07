"use client";

import React, { useState, ChangeEvent } from "react";
import { useGlobalContext } from "@/context/Globalcontext";
import SecondaryLayout from "@/components/SecondaryLayout";
import { doc, updateDoc, addDoc, collection, deleteDoc, getDoc } from "firebase/firestore";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import Drawer from "@/components/Drawer";
import { FaEllipsisH, FaEdit, FaTrash, FaPlay } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "@/utils/firebaseconfig"; // <-- import the Firestore instance from your firebase.ts
import { Connection } from "@solana/web3.js";
import * as anchor from '@coral-xyz/anchor';
import { IDL, LoanProgram } from "@/components/instructions/loan_program";
import BN from "bn.js";
import { LoanProgramID } from "@/components/instructions/Config";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic'

const StripeModal = dynamic(() => import('@/components/Stripe'), { ssr: false })

import {
  PublicKey,
  Transaction as SolanaTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { withdraw } from "@/components/instructions/withdraw";
import { deposit } from "@/components/instructions/deposit";
import { buildVersionedTransaction } from "@/components/instructions/buildTransaction";
import { SendTransaction } from "@/components/instructions/transaction-send";

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
  poolAddress: string;
  agreementHash: string;
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
  const connection = new Connection("https://api.devnet.solana.com");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>("");
  const router = useRouter();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { user, allTransactions, setAllTransactions, depositAMountViastripe,
    setDepositAMountViastripe, setTransactionDocId, transactionDocId } = useGlobalContext();
  const walletContext = useWallet();
  const wallet = useAnchorWallet();



  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [isdepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<"solana" | "stripe">("solana");
  const [tobeDepositedTransaction, setTobeDepositedTransaction] = useState<Transaction | null>(null);

  const [transactionDetails, setTransactionDetails] = useState<Transaction>({
    poolName: "",
    transactionDate: new Date().toISOString().split("T")[0],
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
    poolAddress: "",
    agreementHash: "",

  });

  const confirmOptions = {
    skipPreflight: true,
  };

  const handleDepositViaSolana = async () => {
    try {
      if (!walletContext?.publicKey || !walletContext.sendTransaction) {
        toast.error("Wallet not connected or cannot sign transactions");
        return;
      }

      if (!transactionDetails.tokenAddress || !transactionDetails.amount) {
        toast.error("Please fill in all fields (amount, address).");
        return;
      }

      const solAmount = parseFloat(transactionDetails.amount);
      if (isNaN(solAmount) || solAmount <= 0) {
        toast.error("Invalid SOL amount.");
        return;
      }

      // Convert SOL to lamports
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      // Parse the destination address
      const Mint = new PublicKey(transactionDetails.tokenAddress);

      // Build transfer instruction


      const provider = new AnchorProvider(
        connection,
        wallet!,
        AnchorProvider.defaultOptions()
      );
      const program = new anchor.Program<LoanProgram>(IDL, LoanProgramID, provider);

      const instruction = await deposit(
        program,
        wallet?.publicKey!,
        new PublicKey(transactionDetails.poolAddress),
        Mint,
        lamports,
        Array.from(transactionDetails.agreementHash).map(char => char.charCodeAt(0)),
      )

      const versionedtransaction = await buildVersionedTransaction({
        instructions: [instruction.instruction],
        wallet: walletContext,
        connection
      })

      let signature;
      try {
        // Send the transaction
        signature = await SendTransaction(versionedtransaction, connection, walletContext);


        // Display a success toast with a link to the transaction
        toast.info(
          <div>
            Deposited successfully!{" "}
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              View transaction
            </a>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          }
        );

      } catch (error: any) {
        console.error('Error sending transaction:', error);

        // Display an error toast
        toast.error(`Failed to send transaction: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      }




      if (tobeDepositedTransaction && tobeDepositedTransaction.docId) {
        const docRef = doc(db, "transactions", tobeDepositedTransaction.docId);
        const existingSnap = await getDoc(docRef);

        if (!existingSnap.exists()) {
          toast.error("Transaction doc does not exist in Firestore!");
          return;
        }

        // Get old amount from Firestore
        const existingData = existingSnap.data();
        const oldAmount = parseFloat(existingData.amount || "0") || 0;

        // Add the new deposit
        const newTotal = oldAmount + solAmount;
        // Round to 6 decimal places
        const finalRounded = parseFloat(newTotal.toFixed(6));

        const updatedTransaction = {
          ...tobeDepositedTransaction,
          amount: finalRounded.toString(),
          depositedState: "deposited",
          solanaTxSignature: signature,
        };

        // Update Firestore
        await updateDoc(docRef, {
          amount: finalRounded.toString(),
          depositedState: "deposited",
          solanaTxSignature: signature,
        });

        // Update local state array
        const updatedTransactions = allTransactions.map((tx) =>
          tx.docId === tobeDepositedTransaction.docId ? updatedTransaction : tx
        );
        setAllTransactions(updatedTransactions);

        // Clear
        setTobeDepositedTransaction(null);
      }

      setIsDepositDrawerOpen(false);
      toast.success(
        <div>
          Deposit via Solana successful!{" "}
          <a
            href={`https://solscan.io/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            View on Solscan
          </a>
        </div>
      );

    } catch (error: any) {
      console.error("Error depositing via Solana:", error);
      toast.error(`Deposit failed: ${error.message || error.toString()}`);
    }
  };

  const handleDepositViaStripe = async (amount: number) => {
    const usdAmount = amount; // Replace with dynamic amount as needed

    // Replace this with actual transaction data as needed
    const transactionData = {
      amount: usdAmount,
      status: "pending",
      createdAt: new Date(),
      // ...other relevant fields
    };

    try {
      setCurrentAmount(usdAmount);
      setCurrentTransactionId(tobeDepositedTransaction?.docId as string);

      // Set deposit amount and transactionDocId in global context
      setDepositAMountViastripe(usdAmount);
      setTransactionDocId(tobeDepositedTransaction?.docId);
      console.log(usdAmount, tobeDepositedTransaction?.docId);

      // Open the modal
      setIsModalOpen(true);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to initiate deposit. Please try again.");
    }
  };


  const handleTransactionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransactionDetails((prev) => ({ ...prev, [name]: value }));
  };


  const handleCloseModal = () => {
    setIsModalOpen(false);
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


  const handleWithDraw = async () => {
    if (!wallet?.publicKey) {
      toast.error("Wallet not connected!");
      return;
    }
    try {

      // 1) Build your program
      const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
      );
      const program = new anchor.Program<LoanProgram>(IDL, LoanProgramID, provider);

      const Mint = new PublicKey(transactionDetails.tokenAddress);

      // Step 3: Get the pool account to fetch deposit count
      const poolAccount = await program.account.pool.fetch(transactionDetails.poolAddress);
      const depositCount = poolAccount.depositCount;

      // Convert depositCount (BN) to a number
      const depositCountNumber = depositCount.toNumber();

      const [depositAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          wallet.publicKey.toBuffer(),
          new PublicKey(transactionDetails.poolAddress).toBuffer(),
          Buffer.from([depositCountNumber]),
        ],
        program.programId
      );

      const instruction = await withdraw(
        program,
        wallet.publicKey, // Use admin as the withdrawer
        new PublicKey(transactionDetails.poolAddress), // Use the created pool address
        Mint,
        500, // Amount to withdraw (half of the deposited amount)
        depositAddress, // Use the deposit address created earlier
        confirmOptions
      );

      const versionedtransaction = await buildVersionedTransaction({
        instructions: [instruction.instructions],
        wallet: walletContext,
        connection
      })

      // Send the transaction
      const signature = await SendTransaction(versionedtransaction, connection, walletContext);

      // 4) Wait or confirm. Then update Firestore if desired
      toast.success(`Withdraw transaction signature: ${signature}`);
      // Possibly store that the user withdrew `withdrawAmount` from Firestore

      setIsWithdrawOpen(false);

    } catch (error) {
      console.error("Withdraw failed:", error);
      if (error instanceof Error) {
        toast.error(`Withdraw failed: ${error.message}`);
      } else {
        toast.error("Withdraw failed: An unknown error occurred.");
      }
    }
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
                          <button onClick={() => setIsWithdrawOpen(true)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaPlay className="mx-2" />WithDraw</button>
                          <button onClick={() => { setIsDepositDrawerOpen(true); setTobeDepositedTransaction(transaction); setMenuOpenIndex(null); setTransactionDetails(transaction) }} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaPlay className="mx-2" />Deposit</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Stripe Modal */}
          {/* <StripeModal isOpen={isModalOpen} onClose={handleCloseModal} amount={depositAMountViastripe} transactionId = {transactionDocId} />
           */}
          <StripeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            amount={currentAmount}
            transactionId={currentTransactionId}
          />
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
                  Solana
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
                  {/* <InputField
                    label="Deposit SOL to this address"
                    name="tokenAddress"
                    type="text"
                    placeholder="fsurfy734fu3f3y74few349"
                    value={transactionDetails.tokenAddress}
                    onChange={handleTransactionInputChange}
                  /> */}
                  <InputField
                    label="Deposite SOL Amount"
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

          {isWithdrawOpen && (
            <Drawer onClose={() => setIsWithdrawOpen(false)}>
              <div className="mb-2">
                <h2 className="text-xl font-semibold">Withdraw from Pool</h2>
              </div>
              <input
                type="number"
                placeholder="Amount to withdraw"
                value={withdrawAmount}
                className="w-full p-2 border rounded"
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <button className="w-full bg-black text-white py-2 rounded my-4" onClick={handleWithDraw}>Confirm</button>
            </Drawer>
          )}
        </div>
      </SecondaryLayout>
    )
  );
};

export default Page;