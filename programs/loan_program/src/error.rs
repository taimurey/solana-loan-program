use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds available")]
    InsufficientFunds,
    #[msg("Arithmetic error occurred")]
    ArithmeticError,
    #[msg("Invalid account configuration")]
    InvalidAccountConfig,
    #[msg("Pool is paused")]
    PoolPaused,
    #[msg("Invalid agreement hash")]
    InvalidAgreement,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid loan term. Loan term must be greater than zero.")]
    InvalidLoanTerm,
    #[msg("Invalid payment frequency. Payment frequency must be greater than zero.")]
    InvalidPaymentFrequency,
}
