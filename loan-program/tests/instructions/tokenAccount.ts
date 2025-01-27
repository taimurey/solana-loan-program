import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { LoanProgram } from "../../target/types/loan_program";

/**
 * Create an associated token account (ATA) for the user if it doesn't exist
 * @param program - Anchor program instance
 * @param user - User's keypair
 * @param tokenMint - Token mint address
 * @param confirmOptions - Transaction confirmation options
 */
export async function createUserTokenAccount(
    program: Program<LoanProgram>,
    user: Keypair,
    tokenMint: PublicKey,
    confirmOptions?: anchor.web3.ConfirmOptions
) {
    try {
        // Derive the associated token account address
        const userTokenAccount = await anchor.utils.token.associatedAddress({
            mint: tokenMint,
            owner: user.publicKey,
        });

        // Check if the token account already exists
        const accountInfo = await program.provider.connection.getAccountInfo(userTokenAccount);
        if (accountInfo) {
            console.log("User token account already exists:", userTokenAccount.toString());
            return { userTokenAccount };
        }

        // Create the associated token account instruction
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
            user.publicKey, // Payer
            userTokenAccount, // Associated token account address
            user.publicKey, // Owner
            tokenMint // Token mint
        );

        // Build and send the transaction
        const transaction = new Transaction().add(createAtaInstruction);
        const tx = await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            transaction,
            [user], // Signer
            confirmOptions
        );

        console.log("User Token Account Creation Transaction Signature:", tx);
        console.log("User Token Account Address:", userTokenAccount.toString());

        return {
            tx,
            userTokenAccount,
        };
    } catch (error) {
        console.error("Error creating user token account:", error);
        throw error;
    }
}