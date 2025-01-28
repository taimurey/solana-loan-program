import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createSyncNativeInstruction, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { LoanProgram } from "./loan_program";

/**
 * Deposit funds into a pool
 * @param program - Anchor program instance
 * @param user - User's keypair
 * @param poolAddress - Address of the pool
 * @param tokenMint - Token mint address (USDC or NATIVE_MINT for SOL)
 * @param amount - Amount to deposit (in smallest units, e.g., lamports for SOL)
 * @param agreementHash - Agreement hash (32-byte array)
 * @param confirmOptions - Transaction confirmation options
 */
export async function deposit(
    program: Program<LoanProgram>,
    user: PublicKey,
    poolAddress: PublicKey,
    tokenMint: PublicKey,
    amount: number,
    agreementHash: number[],
) {
    try {
        // Step 1: Get the user's token account
        const userTokenAccount = await anchor.utils.token.associatedAddress({
            mint: tokenMint,
            owner: user,
        });

        // Step 2: Derive PDAs
        const [userStatsAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_stats"), user.toBuffer()],
            program.programId
        );

        const [vaultAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), poolAddress.toBuffer()],
            program.programId
        );

        const [vaultAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault_authority"), poolAddress.toBuffer()],
            program.programId
        );

        // Step 3: Get the pool account to fetch deposit count
        const poolAccount = await program.account.pool.fetch(poolAddress);
        const depositCount = poolAccount.depositCount;

        // Convert depositCount (BN) to a number
        const depositCountNumber = depositCount.toNumber();

        const [depositAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("deposit"),
                user.toBuffer(),
                poolAddress.toBuffer(),
                Buffer.from([depositCountNumber]), // Use the number value
            ],
            program.programId
        );

        // Convert agreement hash to Uint8Array
        const agreementHashArray = new Uint8Array(agreementHash);

        // Step 4: Create ATA and Sync Native instructions (if SOL)
        const preInstructions = [];
        if (tokenMint.equals(NATIVE_MINT)) {
            // Create ATA if it doesn't exist
            const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                user,
                userTokenAccount,
                user,
                NATIVE_MINT
            );
            preInstructions.push(createAtaIx);

            // Transfer SOL to WSOL account
            const transferSolIx = SystemProgram.transfer({
                fromPubkey: user,
                toPubkey: userTokenAccount,
                lamports: amount,
            });
            preInstructions.push(transferSolIx);

            // Sync Native instruction
            const syncNativeIx = createSyncNativeInstruction(userTokenAccount);
            preInstructions.push(syncNativeIx);
        }

        // Step 5: Build and send the deposit transaction
        const instruction = await program.methods
            .deposit(
                new anchor.BN(amount), // Amount
                Array.from(agreementHashArray) // Agreement hash
            )
            .accounts({
                pool: poolAddress,
                deposit: depositAddress,
                payer: user,
                vaultAuthority,
                userTokenAccount,
                poolVault: vaultAddress,
                userStats: userStatsAddress,
                tokenMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .preInstructions(preInstructions) // Add pre-instructions
            .instruction();

        console.log("Deposit Address:", depositAddress.toString());

        return {
            instruction,
            depositAddress,
            userStatsAddress,
            vaultAddress,
        };
    } catch (error) {
        console.error("Error depositing:", error);
        throw error;
    }
}
