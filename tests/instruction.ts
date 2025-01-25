import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import { LoanProgram } from '../target/types/loan_program';

export async function createPool(
    program: Program<LoanProgram>,
    connection: anchor.web3.Connection,
    admin: Keypair,
    name: string, // Pass name as a string
    interestRate: number,
    loanTermMonths: number,
    paymentFrequency: number,
    agreementTemplateHash: number[],
    confirmOptions?: anchor.web3.ConfirmOptions
) {
    try {
        // Derive PDAs
        const [poolAddress, poolBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), admin.publicKey.toBuffer()],
            program.programId
        );

        const [vaultAddress, vaultBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), poolAddress.toBuffer()],
            program.programId
        );

        const [vaultAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault_authority"), poolAddress.toBuffer()],
            program.programId
        );
        const [tokenMint] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool_mint")],
            program.programId
        );

        // Convert agreement hash to Uint8Array
        const agreementHashArray = new Uint8Array(agreementTemplateHash);

        // Set compute budget if needed
        const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 400_000,
        });

        const priorityFeeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1,
        });

        // Build and send transaction
        const tx = await program.methods
            .createPool(
                name, // Pass name as a string
                new BN(interestRate), // Convert to BN
                new BN(loanTermMonths), // Convert to BN
                new BN(paymentFrequency), // Convert to BN
                Array.from(agreementHashArray) // Convert to number array
            )
            .accounts({
                pool: poolAddress,
                admin: admin.publicKey,
                poolVault: vaultAddress,
                vaultAuthority,
                tokenMint,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .preInstructions([computeBudgetIx, priorityFeeIx])
            .rpc(confirmOptions);

        console.log("Create Pool Transaction:", tx);
        console.log("Pool Address:", poolAddress.toString());
        console.log("Vault Address:", vaultAddress.toString());

        return {
            tx,
            poolAddress,
            vaultAddress,
            vaultAuthority,
            poolBump,
            vaultBump,
        };
    } catch (error) {
        console.error("Error creating pool:", error);
        throw error;
    }
}