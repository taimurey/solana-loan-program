"use client";

import React, { useState, ChangeEvent } from "react";
import { useGlobalContext } from "@/context/Globalcontext";
import SecondaryLayout from "@/components/SecondaryLayout";
import Drawer from "@/components/Drawer";
import { FaEllipsisH, FaEdit, FaTrash, FaPlay } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { createPool } from "@/components/instructions/createpool";
import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as anchor from '@coral-xyz/anchor';
import { IDL, LoanProgram } from "@/components/instructions/loan_program";
import { LoanProgramID } from "@/components/instructions/Config";
import { generateAgreementHash } from "@/components/instructions/utils";
import { buildVersionedTransaction } from "@/components/instructions/buildTransaction";
import { SendTransaction } from "@/components/instructions/transaction-send";
import { doc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseconfig"; // <-- import the Firestore instance from your firebase.ts
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
    PublicKey,
    Transaction as SolanaTransaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password123";
interface Pool {
    // Firestore document ID
    docId?: string;
    poolName: string;
    pool: string;
    interestRateBps: number; // or number, depending on how you store it
    loanTermMonths: number;  // or number
    paymentFrequency: number; // or number
    agreementHash: string;
    timestamp: string;
    index: number;

    poolAddress: PublicKey | null;
    vaultAddress: PublicKey | null;
    vaultAuthority: PublicKey | null;
    tokenMint: PublicKey | null;

    transactionSignature: string;

    creator: string;

    description?: string;
    contractTerms?: string;
}


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
    value: string | number;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type, placeholder, value, onChange, required }) => (
    <div className="mb-2">
        <label className="block text-gray-700 font-semibold mb-1" htmlFor={name}>{label}{required && <span className="text-red-500"> *</span>}</label>
        <input
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full p-2 border rounded"
            required={required}
        />
    </div>
);


const Page = () => {
    const connection = new Connection("https://api.devnet.solana.com");
    const walletContext = useWallet();
    const wallet = useAnchorWallet();
    const { user, accounts, pools, setPools, allTransactions, setAllTransactions } = useGlobalContext();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [iscontinueDrawerOpen, setIsContinueDrawerOpen] = useState(false);
    const [isdepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [selectedDepositMethod, setSelectedDepositMethod] = useState<"solana" | "stripe">("solana");
    const [tobeDepositedTransaction, setTobeDepositedTransaction] = useState<Transaction | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("password123");


    const handleLogin = () => {
        console.log("Logging in with", username, password);
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success("Login successful!");
        } else {
            toast.error("Invalid credentials");
        }
    };

    const [newPool, setNewPool] = useState<Pool>({
        poolName: "",
        index: 0,
        pool: "0.001",
        description: "",
        interestRateBps: 0.00,
        loanTermMonths: 0,
        paymentFrequency: 0,
        poolAddress: null,
        contractTerms: "",
        vaultAddress: null,
        vaultAuthority: null,
        tokenMint: null,
        agreementHash: "",
        timestamp: new Date().toISOString(),
        transactionSignature: "",
        creator: "",
    });
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCriteria, setFilterCriteria] = useState("name");
    const [continuePool, setContinuePool] = useState<Pool | null>(null);

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

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewPool((prevPool) => ({ ...prevPool, [name]: value }));
    };

    const handleTransactionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTransactionDetails((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreatePool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPool.poolName || !newPool.description || !newPool.index || !newPool.interestRateBps ||
            !newPool.loanTermMonths || !newPool.paymentFrequency ||
            !newPool.contractTerms) {
            toast.error("All fields are required");
            return;
        }
        if (!wallet?.publicKey) {
            toast.error("Please connect your wallet");
            return;
        }
        try {
            const confirmOptions = {
                skipPreflight: true,
            };


            const provider = new AnchorProvider(
                connection,
                wallet,
                anchor.AnchorProvider.defaultOptions()
            );

            // const program = anchor.workspace.LoanProgram as anchor.Program<LoanProgram>;
            const program = new anchor.Program(
                IDL,
                LoanProgramID,
                provider
            ) as anchor.Program<LoanProgram>;


            // Define agreement terms
            const agreementTerms = {
                poolName: newPool.poolName,
                index: newPool.index,
                interestRate: newPool.interestRateBps, // 5% in basis points
                loanTerm: newPool.loanTermMonths, // 8 months
                paymentFrequency: newPool.paymentFrequency, // Monthly payments
                depositFee: 300, // 3% for Instant Bank Payment
                timestamp: new Date().toISOString() // Include a timestamp for uniqueness
            };

            const agreementHash = generateAgreementHash(agreementTerms);
            // Step 1: Create the pool

            const { instruction, poolAddress, vaultAddress, vaultAuthority, tokenMint } =
                await createPool(
                    program,
                    connection,
                    wallet, // Admin wallet
                    agreementTerms.poolName,
                    agreementTerms.interestRate,
                    agreementTerms.loanTerm,
                    agreementTerms.paymentFrequency,
                    Array.from(agreementHash), // Agreement hash as array
                    confirmOptions
                );


            // build dummy instructions here laater will be replaced with actual instructions



            const versionedtransaction = await buildVersionedTransaction({
                instructions: [instruction],
                wallet: walletContext,
                connection
            })

            // Send the transaction
            const signature = await SendTransaction(versionedtransaction, connection, walletContext);





            toast.info(
                <div>
                    Pool initialized successfully!{" "}
                    <a
                        href={`https://solscan.io/tx/${signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "underline" }}
                    >
                        View transaction
                    </a>
                </div>)




            const poolData = {
                // user inputs
                poolName: newPool.poolName,
                interestRateBps: newPool.interestRateBps,
                loanTermMonths: newPool.loanTermMonths,
                paymentFrequency: newPool.paymentFrequency,
                agreementHash: Buffer.from(agreementHash).toString('base64'), // replaced with actual hash
                timestamp: new Date().toISOString(),

                // on-chain addresses
                poolAddress: poolAddress.toBase58(),
                vaultAddress: vaultAddress.toBase58(),
                vaultAuthority: vaultAuthority.toBase58(),
                tokenMint: tokenMint.toBase58(),

                // transaction
                transactionSignature: signature,

                // any other user or system data
                creator: wallet.publicKey.toBase58(),
            };


            if (isEditing && editIndex !== null) {
                // We're in editing mode, so update the existing doc
                const poolToUpdate = pools[editIndex];

                if (!poolToUpdate.docId) {
                    // If we don't have a docId, we can't update in Firestore,
                    // so we might fallback to creating a new doc or show an error.
                    toast.error("No docId found. Cannot update Firestore document.");
                    return;
                }

                // 1) Create a reference to the existing doc in "pools" collection
                const docRef = doc(db, "pools", poolToUpdate.docId);

                // 2) Update the doc
                await updateDoc(docRef, poolData);
                toast.success("Pool updated successfully in Firestore!");

                // 3) Also update the local array of pools
                const updatedPools = [...pools];
                // We might keep the same docId
                updatedPools[editIndex] = {
                    ...newPool,
                    docId: poolToUpdate.docId, // Keep the same docId
                };
                setPools(updatedPools);
            } else {
                // setPools([...pools, newPool]);
                const docRef = await addDoc(collection(db, "pools"), poolData);
                setPools([
                    ...pools,
                    {
                        ...newPool,
                        docId: docRef.id, // Store the newly created docId
                    },
                ]);
                console.log("Pool saved in Firestore with ID: ", docRef.id);
                toast.success("Pool created & saved in Firestore!");
            }
            setNewPool({
                poolName: "",
                pool: "0.001",
                description: "",
                interestRateBps: 0.00,
                loanTermMonths: 0,
                paymentFrequency: 0,
                poolAddress: null,
                contractTerms: "",
                vaultAddress: null,
                vaultAuthority: null,
                tokenMint: null,
                agreementHash: "",
                timestamp: new Date().toISOString(),
                transactionSignature: "",
                creator: "",
                index: 0,

            });


            // this is dummy pool data for now to make database work 
            setIsDrawerOpen(false);
            setIsEditing(false);
        } catch (error) {
            console.error("Error creating and saving pool:", error);
            toast.error("Error creating pool: " + error);
        }
    };

    const handleEdit = (index: number) => {
        setMenuOpenIndex(null);
        setNewPool(pools[index]);
        setEditIndex(index);
        setIsEditing(true);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (docId: string | undefined) => {
        try {
            if (!docId) {
                // If there's no docId, we can't delete it from Firestore
                toast.error("No docId found. Can't delete from Firestore.");
                return;
            }

            // 1. Delete from Firestore
            await deleteDoc(doc(db, "pools", docId));

            // 2. Remove from local state
            const updatedPools = pools.filter((pool) => pool.docId !== docId);
            setPools(updatedPools);

            toast.info("Pool deleted successfully!");
            setMenuOpenIndex(null);
        } catch (error) {
            console.error("Error deleting pool:", error);
            toast.error("Error deleting pool from Firestore");
        }
    };

    const handleContinue = (index: number) => {
        setMenuOpenIndex(null);
        const selectedPool = pools[index];
        setContinuePool(selectedPool);
        setTransactionDetails({
            poolName: selectedPool.poolName,
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
            depositedState: "not deposited",
            amount: "0.00",
            tokenAddress: selectedPool.tokenMint?.toBase58() || "",
            poolDocId: selectedPool.docId || "",
        });

        setIsContinueDrawerOpen(true);
    };

    // Step 1) "Save Transaction" remains the same
    const handleSaveTransaction = async () => {
        try {
            if (!continuePool) {
                toast.error("No pool selected!");
                return;
            }

            // 1) Build new transaction data
            const newTransaction: Transaction = {
                poolDocId: continuePool.docId || "",
                poolName: continuePool.poolName,
                transactionDate: transactionDetails.transactionDate,
                fullName: transactionDetails.fullName,
                email: transactionDetails.email,
                phoneNumber: transactionDetails.phoneNumber,
                streetLine1: transactionDetails.streetLine1,
                streetLine2: transactionDetails.streetLine2,
                zipCode: transactionDetails.zipCode,
                city: transactionDetails.city,
                region: transactionDetails.region,
                country: transactionDetails.country,
                contractTerms: transactionDetails.contractTerms,
                depositedState: "not deposited", // set default as not yet deposited
                amount: transactionDetails.amount,
                tokenAddress: transactionDetails.tokenAddress,
            };

            // 2) Save to Firestore
            const docRef = await addDoc(collection(db, "transactions"), newTransaction);

            // 3) Store docId in local state for future updates
            const savedTransaction = { ...newTransaction, docId: docRef.id };

            // 4) Update your global or local state
            setAllTransactions([...allTransactions, savedTransaction]);

            toast.success("Transaction saved successfully!");
            setIsContinueDrawerOpen(false);

            // 5) Open deposit drawer
            setIsDepositDrawerOpen(true);
            setTobeDepositedTransaction(savedTransaction);

        } catch (error) {
            console.error("Error saving transaction:", error);
            toast.error("Failed to save transaction");
        }
    };


    // Step 2) "Deposit via Solana" updated to do a real SOL transfer
    const handleDepositViaSolana = async () => {
        try {
            if (!walletContext?.publicKey || !walletContext.sendTransaction) {
                toast.error("Wallet not connected or cannot sign transactions");
                return;
            }

            // Make sure we have an amount & address
            if (!transactionDetails.tokenAddress || !transactionDetails.amount) {
                toast.error("Please fill in all fields (amount, address).");
                return;
            }

            // Convert user input to a valid float
            const solAmount = parseFloat(transactionDetails.amount);
            if (isNaN(solAmount) || solAmount <= 0) {
                toast.error("Invalid SOL amount.");
                return;
            }

            // Convert SOL to lamports
            const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

            // Parse the destination address
            const toPubkey = new PublicKey(transactionDetails.tokenAddress.trim());

            // Build transfer instruction
            const transferIx = SystemProgram.transfer({
                fromPubkey: walletContext.publicKey,
                toPubkey,
                lamports,
            });

            // Create a transaction and add the instruction
            const transaction = new SolanaTransaction().add(transferIx);

            // (Optional) Let the wallet handle recent blockhash automatically or 
            // you can fetch and set it yourself.

            // Send the transaction (Phantom will prompt approval)
            const signature = await walletContext.sendTransaction(transaction, connection);

            // Wait for confirmation
            await connection.confirmTransaction(signature, "confirmed");

            // If we have an active transaction in local state, update Firestore
            if (tobeDepositedTransaction) {
                const updatedTransaction = {
                    ...tobeDepositedTransaction,
                    amount: transactionDetails.amount,  // store final deposit amount
                    depositedState: "deposited",
                    solanaTxSignature: signature,       // store signature
                };

                // Update local transactions array
                const updatedTransactions = allTransactions.map((tx) =>
                    tx.docId === tobeDepositedTransaction.docId ? updatedTransaction : tx
                );
                setAllTransactions(updatedTransactions);

                // Update Firestore doc
                if (tobeDepositedTransaction.docId) {
                    await updateDoc(
                        doc(db, "transactions", tobeDepositedTransaction.docId),
                        {
                            amount: transactionDetails.amount,
                            depositedState: "deposited",
                            solanaTxSignature: signature,
                        }
                    );
                }

                // Clear the active transaction
                setTobeDepositedTransaction(null);
            }

            // Close the deposit drawer
            setIsDepositDrawerOpen(false);

            // Show success with a link to Solscan (Devnet example)
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


    // const handleDepositViaSolana = async () => {
    //     if (!transactionDetails.tokenAddress || !transactionDetails.amount) {
    //         toast.error("Please fill in all fields.");
    //         return;
    //     }

    //     if (tobeDepositedTransaction) {
    //         // Create an updated transaction in local state
    //         const updatedTransaction = {
    //             ...tobeDepositedTransaction,
    //             amount: transactionDetails.amount,
    //             depositedState: "deposited",
    //         };

    //         // Update the global state
    //         const updatedTransactions = allTransactions.map((t) =>
    //             t.docId === tobeDepositedTransaction.docId ? updatedTransaction : t
    //         );
    //         setAllTransactions(updatedTransactions);

    //         // 1) Update Firestore if we have a docId
    //         if (tobeDepositedTransaction.docId) {
    //             try {
    //                 await updateDoc(
    //                     doc(db, "transactions", tobeDepositedTransaction.docId),
    //                     {
    //                         amount: transactionDetails.amount,
    //                         depositedState: "deposited",
    //                     }
    //                 );
    //             } catch (error) {
    //                 console.error("Error updating transaction in Firestore:", error);
    //                 toast.error("Could not update transaction in Firestore");
    //             }
    //         }

    //         // Clear the active transaction
    //         setTobeDepositedTransaction(null);
    //     }

    //     setIsDepositDrawerOpen(false);
    //     toast.success("Deposit via Solana successful!");
    // };


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
                        amount: tobeDepositedTransaction.amount,// will be replaced when strip starts working, added same, just not to overwrite solana added amount
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


    const handleCloseDepositDrawer = () => {
        setIsDepositDrawerOpen(false);
        setTobeDepositedTransaction(null); // Clear the active transaction
    };
    const filteredPools = pools.filter((pool) => {
        if (filterCriteria === "name") {
            return pool.poolName.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (filterCriteria === "interestRate") {
            return pool.interestRateBps.toString().includes(searchTerm);
        } else if (filterCriteria === "loanTerm") {
            return pool.loanTermMonths.toString().includes(searchTerm);
        } else if (filterCriteria === "paymentFrequency") {
            return pool.paymentFrequency.toString().includes(searchTerm);
        } else if (filterCriteria === "address") {
            return pool.poolAddress?.toBase58().toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="bg-white p-6 rounded-lg shadow-md w-96">
                    <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full p-2 border rounded mb-2"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border rounded mb-4"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        className="w-full bg-blue-600 text-white py-2 rounded"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }


    const connectWallet = async () => {
        try {
            const response = await window.solana.connect();
            console.log('Wallet connected:', response.publicKey.toString());
            // Now you can set the user state with the wallet info
        } catch (err) {
            console.error('Failed to connect wallet', err);
        }
    };
    return (
        user ? (
            <SecondaryLayout title={`Welcome back, ${user.name}`} description="This is your Financial Administrator overview portal.">
                <div className="bg-white rounded-2xl p-6 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-semibold text-black/90">Pools</h1>
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                            onClick={() => { setIsDrawerOpen(true); setIsEditing(false); }}
                        >
                            + Create Pool
                        </button>
                    </div>

                    {/* Search and Filter Inputs */}
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                        <select
                            value={filterCriteria}
                            onChange={(e) => setFilterCriteria(e.target.value)}
                            className="p-2 border rounded"
                        >
                            <option value="name">Name</option>
                            <option value="interestRate">Interest Rate</option>
                            <option value="loanTerm">Loan Term</option>
                            <option value="paymentFrequency">Payment Frequency</option>
                            <option value="address">Address</option>
                        </select>
                    </div>

                    {/* Table to show created pools */}
                    <table className="w-full bg-white shadow-md rounded-lg ">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Interest Rate</th>
                                <th className="p-3 text-left">Loan Term</th>
                                <th className="p-3 text-left">Payment Frequency</th>
                                <th className="p-3 text-left">Address</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPools.map((pool, index) => (
                                <tr key={index} className="border-t">
                                    <td className="p-3">{pool.poolName}</td>
                                    <td className="p-3">{pool.interestRateBps}%</td>
                                    <td className="p-3">{pool.loanTermMonths} Months</td>
                                    <td className="p-3">{pool.paymentFrequency} Times</td>
                                    <td className="p-3">
                                        {pool.poolAddress instanceof PublicKey
                                            ? pool.poolAddress.toBase58()
                                            : pool.poolAddress ? pool.poolAddress : "N/A"}
                                    </td>




                                    <td className="p-3 relative">
                                        <div className="relative group inline-block">
                                            <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-300  " onClick={() => setMenuOpenIndex(menuOpenIndex === index ? null : index)}>
                                                <FaEllipsisH />
                                            </button>
                                            {menuOpenIndex === index && (
                                                <div className="absolute right-4 mt-2 w-40 bg-white shadow-lg rounded-lg z-0  transition-opacity duration-200">
                                                    <button onClick={() => handleEdit(index)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaEdit className="mx-2" /> Edit</button>
                                                    <button onClick={() => handleDelete(pool.docId)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaTrash className="mx-2" /> Delete</button>
                                                    <button onClick={() => handleContinue(index)} className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 w-full"><FaPlay className="mx-2" />Continue</button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {isDrawerOpen && (
                        <Drawer onClose={() => setIsDrawerOpen(false)}>

                            <div className="mb-4">
                                <h2 className="text-xl font-semibold ">New Pool</h2>
                                <p className="text-sm py-1  text-black/70">Create a new pool to organize your Transactions</p>
                            </div>
                            <form onSubmit={handleCreatePool}>

                                <InputField label="Name" name="poolName" type="text" placeholder="e.g. Invest to Business" value={newPool.poolName || ""} onChange={handleInputChange} />
                                <InputField label="Description" name="description" type="text" placeholder="e.g. This pool will get profit from startups" value={newPool.description || ""} onChange={handleInputChange} />
                                <InputField label="Index" name="index" type="number" placeholder="Pool Index" value={newPool.index} onChange={handleInputChange} />
                                <InputField label="Interest Rate" name="interestRateBps" type="number" placeholder="Interest Rate" value={newPool.interestRateBps || ""} onChange={handleInputChange} />
                                <InputField label="Loan Term" name="loanTermMonths" type="number" placeholder="Loan Term" value={newPool.loanTermMonths || ""} onChange={handleInputChange} />
                                <InputField label="Payment Frequency" name="paymentFrequency" type="number" placeholder="Payment Frequency" value={newPool.paymentFrequency || ""} onChange={handleInputChange} />
                                {/* <InputField
                                    label="Address"
                                    name="poolAddress"
                                    type="text"
                                    placeholder="Address"
                                    value={typeof newPool.poolAddress === "string" ? newPool.poolAddress : ""}
                                    onChange={handleInputChange}
                                /> */}
                                <InputField label="Contract Terms" name="contractTerms" type="text" placeholder="Contract Terms" value={newPool.contractTerms || ""} onChange={handleInputChange} />
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">{isEditing ? "Update Pool" : "Create Pool"} </button>
                            </form>
                        </Drawer>
                    )}

                    {
                        iscontinueDrawerOpen && (
                            <Drawer onClose={() => setIsContinueDrawerOpen(false)}>
                                <div className="mb-2">
                                    <h2 className="text-xl font-semibold ">New Contract Sign: {continuePool?.poolName}</h2>
                                    <p className="text-sm py-1  text-black/70">Enter the information carefully</p>
                                </div>

                                {/* Sign Date */}
                                <InputField
                                    label="Sign Date"
                                    name="transactionDate"
                                    type="date"
                                    placeholder="Transaction Date"
                                    value={transactionDetails.transactionDate}
                                    onChange={handleTransactionInputChange}
                                />

                                {/* Personal Info */}
                                <div>
                                    <InputField
                                        label="Personal Info"
                                        name="fullName"
                                        type="text"
                                        placeholder="Full name"
                                        value={transactionDetails.fullName}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="email"
                                        type="email"
                                        placeholder="Email Address"
                                        value={transactionDetails.email}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="phoneNumber"
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={transactionDetails.phoneNumber}
                                        onChange={handleTransactionInputChange}
                                    />
                                </div>

                                {/* Address */}
                                <div>
                                    <InputField
                                        label="Address "
                                        name="streetLine1"
                                        type="text"
                                        placeholder="Street Line 1"
                                        value={transactionDetails.streetLine1}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="streetLine2"
                                        type="text"
                                        placeholder="Street Line 2"
                                        value={transactionDetails.streetLine2}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="zipCode"
                                        type="text"
                                        placeholder="Zip or Postal Code"
                                        value={transactionDetails.zipCode}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="city"
                                        type="text"
                                        placeholder="City"
                                        value={transactionDetails.city}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="region"
                                        type="text"
                                        placeholder="Region"
                                        value={transactionDetails.region}
                                        onChange={handleTransactionInputChange}
                                    />
                                    <InputField
                                        label=""
                                        name="country"
                                        type="text"
                                        placeholder="Country"
                                        value={transactionDetails.country}
                                        onChange={handleTransactionInputChange}
                                    />
                                </div>

                                {/* Contract Terms */}
                                <InputField
                                    label="Contract Terms"
                                    name="contractTerms"
                                    type="text"
                                    placeholder="Contract Terms"
                                    value={transactionDetails.contractTerms}
                                    onChange={handleTransactionInputChange}
                                />

                                {/* Save Button */}
                                <button onClick={handleSaveTransaction} className="w-full bg-blue-600 text-white py-2 rounded">
                                    Save Transaction
                                </button>
                            </Drawer>
                        )

                    }
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
            : (
                <div className="flex justify-center items-center h-[90vh] bg-gray-100">
                    <WalletMultiButton className="bg-[#2463eb] px-3 py-2 rounded-xl" />
                </div>
            )
    );
};

export default Page;