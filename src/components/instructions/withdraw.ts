import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createSyncNativeInstruction, NATIVE_MINT } from "@solana/spl-token";
import { LoanProgram } from "./loan_program";

/**
 * Withdraw funds from a pool
 * @param program - Anchor program instance
 * @param user - User's keypair
 * @param poolAddress - Address of the pool
 * @param tokenMint - Token mint address (USDC or NATIVE_MINT for SOL)
 * @param amount - Amount to withdraw (in smallest units, e.g., lamports for SOL)
 * @param depositAddress - Address of the deposit account
 * @param confirmOptions - Transaction confirmation options
 */
export async function withdraw(
    program: Program<LoanProgram>,
    user: PublicKey,
    poolAddress: PublicKey,
    tokenMint: PublicKey,
    amount: number,
    depositAddress: PublicKey,
    confirmOptions?: anchor.web3.ConfirmOptions
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

        console.log(poolAddress.toBase58())

        const [vaultAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), poolAddress.toBuffer()],
            program.programId
        );

        console.log(vaultAddress.toBase58())

        const [vaultAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault_authority"), poolAddress.toBuffer()],
            program.programId
        );

        // Step 3: Get the pool account to fetch vault bump
        const poolAccount = await program.account.pool.fetch(poolAddress);
        const vaultBump = poolAccount.vaultBump;

        // Step 4: Build and send the withdraw transaction
        const instructions = await program.methods
            .withdraw(
                new anchor.BN(amount) // Amount
            )
            .accounts({
                user: user,
                deposit: depositAddress,
                userStats: userStatsAddress,
                userTokenAccount,
                poolVault: vaultAddress,
                vaultAuthority,
                pool: poolAddress,
                tokenMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .remainingAccounts([
                {
                    pubkey: vaultAuthority,
                    isWritable: false,
                    isSigner: false,
                },
            ])
            .instruction();

        console.log("Withdraw Transaction Signature:", instructions);

        return {
            instructions,
            userStatsAddress,
            vaultAddress,
        };
    } catch (error) {
        console.error("Error withdrawing:", error);
        throw error;
    }
}