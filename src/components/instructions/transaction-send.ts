import { WalletContextState } from "@solana/wallet-adapter-react";
import {
    Connection,
    Keypair,
    TransactionSignature,
    VersionedTransaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';

export async function SendTransaction(
    transaction: VersionedTransaction,
    connection: Connection,
    wallet: WalletContextState,
    signers: Keypair[] = []
): Promise<TransactionSignature> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or cannot sign transactions');
    }

    try {
        // Get a recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

        // Update transaction's blockhash
        transaction.message.recentBlockhash = blockhash;

        // If there are additional signers, have them sign first
        if (signers.length > 0) {
            transaction.sign(signers);
        }

        // Sign with the wallet
        const signedTransaction = await wallet.signTransaction(transaction);

        // Send the transaction
        const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3
        });

        // Wait for confirmation with timeout
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        return signature;

    } catch (error: any) {
        // Enhance error message based on error type
        const errorMessage = error.message || 'Unknown error occurred';
        const fullError = error.logs ? `${errorMessage}\nLogs: ${error.logs.join('\n')}` : errorMessage;

        console.error('Transaction failed:', fullError);
        throw new Error(`Transaction failed: ${fullError}`);
    }
}