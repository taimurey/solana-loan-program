use crate::instructions::*;
use anchor_lang::prelude::*;

mod calculator;
mod error;
mod instructions;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gabriel {

    use super::*;

    // // Initialize a new pool
    pub fn create_pool(
        ctx: Context<CreatePool>,
        name: String,
        interest_rate: u64,
        loan_term_months: u64,
        payment_frequency: u64,
    ) -> Result<()> {
        process_create_pool(
            ctx,
            name,
            interest_rate,
            loan_term_months,
            payment_frequency,
        )
    }

    // Make a deposit
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        fee_percent: u8,
        agreement_hash: [u8; 32],
    ) -> Result<()> {
        process_deposit(ctx, amount, fee_percent, agreement_hash)
    }

    // Withdraw funds
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        process_withdraw(ctx, amount)
    }
}
