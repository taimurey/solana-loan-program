import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createPool } from "./instructions/createpool"; // Adjust the import path
import { deposit } from "./instructions/deposit"; // Adjust the import path
import { withdraw } from "./instructions/withdraw"; // Adjust the import path
import { assert } from "chai";
import { LoanProgram } from '../../src/components/instructions/loan_program';
import crypto from 'crypto'; // Import crypto module for hashing
import { Keypair, PublicKey } from '@solana/web3.js';

describe("create pool, deposit, and withdraw test", () => {
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

    it("should create a pool, deposit funds, and withdraw funds successfully", async () => {
        try {
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

            // Generate agreement hash
            const agreementHash = generateAgreementHash(agreementTerms);
            console.log("Agreement Hash:", agreementHash.toString('hex'));

            // Step 1: Create the pool
            const poolResult = await createPool(
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

            console.log("Pool creation transaction signature:", poolResult.tx);
            console.log("Pool address:", poolResult.poolAddress.toString());
            console.log("Vault address:", poolResult.vaultAddress.toString());
            console.log("Vault authority address:", poolResult.vaultAuthority.toString());

            // Add assertions to verify the pool creation
            assert(poolResult.tx, "Pool creation transaction should have a signature");
            assert(poolResult.poolAddress, "Pool address should be created");
            assert(poolResult.vaultAddress, "Vault address should be created");
            assert(poolResult.vaultAuthority, "Vault authority should be created");

            // Step 2: Deposit funds into the pool
            const depositResult = await deposit(
                program,
                admin, // Use admin as the depositor
                poolResult.poolAddress, // Use the created pool address
                poolResult.tokenMint,
                1000000, // Amount to deposit
                5, // Fee percentage (5%)
                Array.from(agreementHash), // Use the same agreement hash
                confirmOptions
            );

            console.log("Deposit transaction signature:", depositResult.tx);
            console.log("Deposit address:", depositResult.depositAddress.toString());
            console.log("User stats address:", depositResult.userStatsAddress.toString());
            console.log("Vault address:", depositResult.vaultAddress.toString());

            // Add assertions to verify the deposit
            assert(depositResult.tx, "Deposit transaction should have a signature");
            assert(depositResult.depositAddress, "Deposit address should be created");
            assert(depositResult.userStatsAddress, "User stats address should be created");
            assert(depositResult.vaultAddress, "Vault address should be created");

            // Step 3: Withdraw funds from the pool
            const withdrawResult = await withdraw(
                program,
                admin, // Use admin as the withdrawer
                poolResult.poolAddress, // Use the created pool address
                poolResult.tokenMint,
                500, // Amount to withdraw (half of the deposited amount)
                depositResult.depositAddress, // Use the deposit address created earlier
                confirmOptions
            );

            console.log("Withdraw transaction signature:", withdrawResult.tx);
            console.log("User stats address:", withdrawResult.userStatsAddress.toString());
            console.log("Vault address:", withdrawResult.vaultAddress.toString());

            // Add assertions to verify the withdrawal
            assert(withdrawResult.tx, "Withdraw transaction should have a signature");
            assert(withdrawResult.userStatsAddress, "User stats address should be updated");
            assert(withdrawResult.vaultAddress, "Vault address should be updated");

        } catch (error) {
            console.error("Test failed:", error);
            throw error;
        }
    });
});