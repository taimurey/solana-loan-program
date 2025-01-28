"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/utils/firebaseconfig"; // <-- Make sure this is your Firestore config file
import { toast } from "react-toastify";
import { PublicKey } from "@solana/web3.js"; // Ensure you import this if not already included

interface User {
  id: string;
  name: string;
  balance: number;
}

interface Account {
  name: string;
  type: string;
  balance: number;
}

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


interface GlobalContextType {
  user: User | null;
  accounts: Account[];
  isLoading: boolean;
  logout: () => void;
  setAccounts: (accounts: Account[]) => void;
  setPools: (pools: Pool[]) => void;
  setAllTransactions: (transactions: Transaction[]) => void;
  allTransactions: Transaction[];
  pools: Pool[];
  depositAMountViastripe: number;
  setDepositAMountViastripe: (amount: number) => void;
  transactionDocId: string | undefined;
  setTransactionDocId: (docId: string | undefined) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [depositAMountViastripe, setDepositAMountViastripe] = useState<number>(0);
  const [transactionDocId, setTransactionDocId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // If we have a connected wallet, set user info and fetch data
    if (publicKey) {
      // Example user
      setUser({ id: publicKey.toBase58(), name: "John Doe", balance: 2500 });

      // Example accounts
      setAccounts([
        { name: "Main Account", type: "Checking", balance: 1500 },
        { name: "Savings Account", type: "Savings", balance: 1000 },
      ]);

      // Fetch the pools from Firestore for this user (or for all, depending on your logic)
      fetchPools(publicKey.toBase58());
      fetchAllTransactions();

    } else {
      // No wallet connected -> clear user/pools
      setUser(null);
      setAccounts([]);
      setPools([]);
    }
    setIsLoading(false);
  }, [publicKey]);


  const fetchPools = async (creatorPubkey?: string) => {
    try {
      // Define query: filter by creatorPubkey if provided, otherwise fetch all pools
      const q = creatorPubkey
        ? query(collection(db, "pools"), where("creator", "==", creatorPubkey))
        : collection(db, "pools");

      // Fetch documents from Firestore
      const querySnapshot = await getDocs(q);

      const fetchedPools: Pool[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();

        // Safely convert Firestore data into a Pool object
        const poolItem: Pool = {
          docId: docSnapshot.id,
          poolName: data.poolName || "Unnamed Pool",
          interestRateBps: data.interestRateBps || 0,
          loanTermMonths: data.loanTermMonths || 0,
          paymentFrequency: data.paymentFrequency || 0,
          agreementHash: data.agreementHash || "",
          timestamp: data.timestamp || new Date().toISOString(),
          poolAddress: data.poolAddress ? new PublicKey(data.poolAddress) : null,
          vaultAddress: data.vaultAddress ? new PublicKey(data.vaultAddress) : null,
          vaultAuthority: data.vaultAuthority ? new PublicKey(data.vaultAuthority) : null,
          tokenMint: data.tokenMint ? new PublicKey(data.tokenMint) : null,
          transactionSignature: data.transactionSignature || "",
          creator: data.creator || "",
          pool: data.pool || "",
          index: data.index || 0,
        };

        fetchedPools.push(poolItem);
      });

      // Update the state with fetched pools
      setPools(fetchedPools);
    } catch (error) {
      console.error("Error fetching pools:", error);
      toast.error("Failed to fetch pools from Firestore");
    }
  };


  const fetchAllTransactions = async () => {
    try {
      // If you want all transactions, do this:
      const q = collection(db, "transactions");

      // If you want only transactions for your user, 
      // you'd need a field like `creator` in the transaction doc 
      // or something else to filter. For example:
      // const q = query(collection(db, "transactions"), where("creator", "==", publicKey.toBase58()))

      const querySnapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Convert Firestore doc to Transaction interface
        const tx: Transaction = {
          docId: docSnapshot.id,
          poolDocId: data.poolDocId || "",
          poolName: data.poolName || "",
          transactionDate: data.transactionDate || "",
          fullName: data.fullName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          streetLine1: data.streetLine1 || "",
          streetLine2: data.streetLine2 || "",
          zipCode: data.zipCode || "",
          city: data.city || "",
          region: data.region || "",
          country: data.country || "",
          contractTerms: data.contractTerms || "",
          depositedState: data.depositedState || "",
          amount: data.amount || "",
          tokenAddress: data.tokenAddress || "",
        };
        fetchedTransactions.push(tx);
      });
      console.log("Fetching all transactions...", fetchedTransactions);

      setAllTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions from Firestore");
    }
  };


  // ✅ Logout function to clear state
  const logout = () => {
    setUser(null);
    setAccounts([]);
    setPools([]);
    setAllTransactions([]);
  };

  // ✅ Use useMemo to optimize context values
  const value = useMemo(() => ({
    user,
    accounts,
    isLoading,
    logout,
    setAccounts,
    setPools,
    setAllTransactions,
    allTransactions,
    pools,
    depositAMountViastripe,
    setDepositAMountViastripe,
    transactionDocId,
    setTransactionDocId,
  }), [user, accounts, isLoading, allTransactions, pools]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

export function useGlobalContext(): GlobalContextType {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}