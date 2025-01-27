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

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password123";
interface Pool {
    // Firestore document ID
    docId?: string;
    poolName: string;
    pool: string;
    interestRateBps: string; // or number, depending on how you store it
    loanTermMonths: string;  // or number
    paymentFrequency: string; // or number
    agreementHash: string;
    timestamp: string;

    poolAddress: string;
    vaultAddress: string;
    vaultAuthority: string;
    tokenMint: string;

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
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success("Login successful!");
        } else {
            toast.error("Invalid credentials");
        }
    };

    const [newPool, setNewPool] = useState<Pool>({
        poolName: "",
        pool: "0.001",
        description: "",
        interestRateBps: "0.00",
        loanTermMonths: "0",
        paymentFrequency: "0",
        poolAddress: "",
        contractTerms: "",
        vaultAddress: "",
        vaultAuthority: "",
        tokenMint: "",
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

    const handleCreatePool = async () => {
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
                poolName: "MyPool",
                index: 2,
                interestRate: 500, // 5% in basis points
                loanTerm: 8, // 8 months
                paymentFrequency: 1, // Monthly payments
                depositFee: 300, // 3% for Instant Bank Payment
                timestamp: new Date().toISOString() // Include a timestamp for uniqueness
            };

            const agreementHash = generateAgreementHash(agreementTerms);
            // Step 1: Create the pool
            const instruction = await createPool(
                program,
                connection,
                wallet, // admin (Keypair)
                agreementTerms.poolName, // Pool name (string)
                agreementTerms.interestRate, // Interest rate
                agreementTerms.loanTerm, // Loan term
                agreementTerms.paymentFrequency, // Payment frequency
                Array.from(agreementHash), // Convert Uint8Array to array of numbers
                confirmOptions // Optional argument
            );

            // build dummy instructions here laater will be replaced with actual instructions



            const versionedtransaction = await buildVersionedTransaction({
                instructions: [instruction.instruction],
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




            // // creating dummy instructions here laater will be replaced with actual instructions
            // const instruction = {
            //     poolAddress: "11111111111111111111111111111111",
            //     vaultAddress: "22222222222222222222222222222222",
            //     vaultAuthority: "33333333333333333333333333333333",
            //     tokenMint: "So11111111111111111111111111111111111111112", // another real example if you want
            //     instruction: {
            //         keys: [],
            //         programId: "11111111111111111111111111111111",
            //         data: Buffer.from("data"),
            //     },
            // };


            // // creating a dummy signature for now to make database work
            // const signature = "dummySignature";
            const poolData = {
                // user inputs
                poolName: newPool.poolName,
                interestRateBps: newPool.interestRateBps,
                loanTermMonths: newPool.loanTermMonths,
                paymentFrequency: newPool.paymentFrequency,
                agreementHash: "agreementHash", // replaced with actual hash
                timestamp: new Date().toISOString(),

                // on-chain addresses
                poolAddress: 'instruction.poolAddress',   // if you return it from createPool
                vaultAddress: 'instruction.vaultAddress', // if you return it
                vaultAuthority: ' instruction.vaultAuthority', // if you return it
                tokenMint: 'instruction.tokenMint',       // if you return it

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
                interestRateBps: "0.00",
                loanTermMonths: "0",
                paymentFrequency: "0",
                poolAddress: "",
                contractTerms: "",
                vaultAddress: "",
                vaultAuthority: "",
                tokenMint: "",
                agreementHash: "",
                timestamp: new Date().toISOString(),
                transactionSignature: "",
                creator: "",

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
            tokenAddress: "dfsgdsgd423fsgfsgdfsgdfsgdfsgdfsgdfsgsdf54",
            poolDocId: selectedPool.docId || "",
        });

        setIsContinueDrawerOpen(true);
    };

    const handleSaveTransaction = async () => {
        try {
            if (!continuePool) {
                toast.error("No pool selected!");
                return;
            }

            // 1) Build new transaction data
            const newTransaction: Transaction = {
                // Link the pool doc ID if available
                poolDocId: continuePool.docId || "",
                poolName: continuePool.poolName, // or continuePool.name if that’s the correct field
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
                depositedState: transactionDetails.depositedState,
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
            // Also open deposit drawer or do any next steps
            setIsDepositDrawerOpen(true);
            setTobeDepositedTransaction(savedTransaction);
        } catch (error) {
            console.error("Error saving transaction:", error);
            toast.error("Failed to save transaction");
        }
    };

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


    const handleCloseDepositDrawer = () => {
        setIsDepositDrawerOpen(false);
        setTobeDepositedTransaction(null); // Clear the active transaction
    };
    const filteredPools = pools.filter((pool) => {
        if (filterCriteria === "name") {
            return pool.poolName.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (filterCriteria === "interestRate") {
            return pool.interestRateBps.includes(searchTerm);
        } else if (filterCriteria === "loanTerm") {
            return pool.loanTermMonths.includes(searchTerm);
        } else if (filterCriteria === "paymentFrequency") {
            return pool.paymentFrequency.includes(searchTerm);
        } else if (filterCriteria === "address") {
            return pool.poolAddress.toLowerCase().includes(searchTerm.toLowerCase());
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

    return (
        user && (
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
                                <th className="p-3 text-left">Pool</th>
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
                                    <td className="p-3">{pool.pool}</td>
                                    <td className="p-3">{pool.interestRateBps}%</td>
                                    <td className="p-3">{pool.loanTermMonths} Months</td>
                                    <td className="p-3">{pool.paymentFrequency} Times</td>
                                    <td className="p-3">{pool.poolAddress}</td>

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
                            <InputField label="Name" name="poolName" type="text" placeholder="e.g. Invest to Business" value={newPool.poolName || ""} onChange={handleInputChange} />
                            <InputField label="Description" name="description" type="text" placeholder="e.g. This pool will get profit from startups" value={newPool.description || ""} onChange={handleInputChange} />
                            <InputField label="Interest Rate" name="interestRateBps" type="number" placeholder="Interest Rate" value={newPool.interestRateBps || ""} onChange={handleInputChange} />
                            <InputField label="Loan Term" name="loanTermMonths" type="number" placeholder="Loan Term" value={newPool.loanTermMonths || ""} onChange={handleInputChange} />
                            <InputField label="Payment Frequency" name="paymentFrequency" type="number" placeholder="Payment Frequency" value={newPool.paymentFrequency || ""} onChange={handleInputChange} />
                            <InputField label="Address" name="poolAddress" type="text" placeholder="Address" value={newPool.poolAddress || ""} onChange={handleInputChange} />
                            <InputField label="Contract Terms" name="contractTerms" type="text" placeholder="Contract Terms" value={newPool.contractTerms || ""} onChange={handleInputChange} />
                            <button onClick={handleCreatePool} className="w-full bg-blue-600 text-white py-2 rounded">Create Pool</button>

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