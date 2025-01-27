use crate::instructions::*;
use anchor_lang::prelude::*;

mod calculator;
mod error;
mod instructions;

declare_id!("BzHmBgkCdK2jNkgXgxQUZrMbrSMgjx4pF2iWHwJFEaVJ");

#[program]
pub mod loan_program {

    use super::*;

    // Initialize a new pool
    pub fn create_pool(
        ctx: Context<CreatePool>,
        name: String,
        interest_rate: u64,
        loan_term_months: u64,
        payment_frequency: u64,
        agreement_template_hash: [u8; 32],
    ) -> Result<()> {
        process_create_pool(
            ctx,
            name,
            interest_rate,
            loan_term_months,
            payment_frequency,
            agreement_template_hash,
        )
    }

    // Pause/unpause the pool (callable by admin only)
    pub fn pause_pool(ctx: Context<PausePool>, pause: bool) -> Result<()> {
        let pool = &mut ctx.accounts.pool.load_mut()?;
        pool.is_paused = pause;
        Ok(())
    }

    // Make a deposit
    pub fn deposit(ctx: Context<Deposit>, amount: u64, agreement_hash: [u8; 32]) -> Result<()> {
        process_deposit(ctx, amount, agreement_hash)
    }

    // Withdraw funds
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        process_withdraw(ctx, amount)
    }
}

#[derive(Accounts)]
pub struct PausePool<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    #[account(mut)]
    pub user: Signer<'info>,
}
