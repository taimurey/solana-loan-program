import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createPool } from "./instruction"; // Adjust the import path
import { assert } from "chai";
import { LoanProgram } from '../target/types/loan_program';
import crypto from 'crypto'; // Import crypto module for hashing
import { Keypair } from '@solana/web3.js';

describe("create pool test", () => {
    // Set up the provider
    anchor.setProvider(anchor.AnchorProvider.env());

    // Get the local wallet as the admin
    const admin = anchor.Wallet.local().payer;
    console.log("Admin address:", admin.publicKey.toString());

    // Get the program from workspace
    const program = anchor.workspace.LoanProgram as Program<LoanProgram>;

    const confirmOptions = {
        skipPreflight: true,
    };

    // Function to generate agreement hash
    function generateAgreementHash(agreementTerms) {
        const agreementString = JSON.stringify(agreementTerms);
        return crypto.createHash('sha256').update(agreementString).digest();
    }

    it("should create a pool successfully", async () => {
        try {
            // Replace with a valid token mint address

            // Define agreement terms
            const agreementTerms = {
                poolName: "MyPool",
                interestRate: 500, // 5% in basis points
                loanTerm: 8, // 8 months
                paymentFrequency: 1, // Monthly payments
                depositFee: 300, // 3% for Instant Bank Payment
                timestamp: new Date().toISOString() // Include a timestamp for uniqueness
            };

            // Generate agreement hash
            const agreementHash = generateAgreementHash(agreementTerms);
            console.log("Agreement Hash:", agreementHash.toString('hex'));

            // Step 1: Create the pool
            const result = await createPool(
                program,
                anchor.getProvider().connection,
                admin,
                agreementTerms.poolName, // Pool name (string)
                agreementTerms.interestRate, // Interest rate
                agreementTerms.loanTerm, // Loan term
                agreementTerms.paymentFrequency, // Payment frequency
                Array.from(agreementHash), // Convert Uint8Array to array of numbers
                confirmOptions
            );

            console.log("Transaction signature:", result.tx);
            console.log("Pool address:", result.poolAddress.toString());
            console.log("Vault address:", result.vaultAddress.toString());
            console.log("Vault authority address:", result.vaultAuthority.toString());

            // Add assertions to verify the pool creation
            assert(result.tx, "Transaction should have a signature");
            assert(result.poolAddress, "Pool address should be created");
            assert(result.vaultAddress, "Vault address should be created");
            assert(result.vaultAuthority, "Vault authority should be created");

        } catch (error) {
            console.error("Test failed:", error);
            throw error;
        }
    });
});