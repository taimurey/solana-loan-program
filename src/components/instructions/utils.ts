import crypto from 'crypto';

export function generateAgreementHash(agreementTerms: any) {
    const agreementString = JSON.stringify(agreementTerms);
    return crypto.createHash('sha256').update(agreementString).digest();
}