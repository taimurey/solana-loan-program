import { WalletContextState } from "@solana/wallet-adapter-react";
import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";

interface BuildVersionedTransactionParams {
    instructions: TransactionInstruction[];
    wallet: WalletContextState;
    signers?: Keypair[];
    feePayer?: PublicKey;
    connection: Connection;
}

/**
 * Builds a versioned transaction from given instructions and parameters
 * @param params BuildVersionedTransactionParams object containing instructions and necessary parameters
 * @returns Promise resolving to VersionedTransaction
 */
export async function buildVersionedTransaction({
    instructions,
    wallet,
    signers = [],
    feePayer,
    connection
}: BuildVersionedTransactionParams): Promise<VersionedTransaction> {
    try {
        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

        // Create transaction message
        const messageV0 = new TransactionMessage({
            payerKey: feePayer || wallet.publicKey!,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();

        // Create versioned transaction
        const transaction = new VersionedTransaction(messageV0);

        // If there are signers, sign the transaction
        if (signers.length > 0) {
            transaction.sign(signers);
        }

        // const signedTransaction = await wallet.signTransaction!(transaction);

        return transaction;
    } catch (error: any) {
        console.error('Error building versioned transaction:', error);
        throw new Error(`Failed to build versioned transaction: ${error.message}`);
    }
}
