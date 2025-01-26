use super::{Pool, POOL_VAULT, VAULT_AUTHORITY};
use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

pub const DEPOSIT_SEED: &str = "deposit";
pub const USER_STATS: &str = "user_stats";

#[account(zero_copy(unsafe))]
#[repr(packed)]
#[derive(Default, Debug)]
pub struct UserStats {
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub available_for_withdraw: u64,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<DepositState>(),
        seeds = [DEPOSIT_SEED.as_bytes(), payer.key.as_ref(), pool.key().as_ref(), &[pool.load()?.deposit_count.try_into().unwrap()]],
        bump
    )]
    pub deposit: AccountLoader<'info, DepositState>,

    /// CHECK:
    #[account(
        seeds = [VAULT_AUTHORITY.as_bytes(), pool.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = payer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK:
    #[account(
        mut,
        seeds = [POOL_VAULT.as_bytes(), pool.key().as_ref()],
        bump,
    )]
    pub pool_vault: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + std::mem::size_of::<UserStats>(),
        seeds = [USER_STATS.as_bytes(), payer.key.as_ref()],
        bump
    )]
    pub user_stats: AccountLoader<'info, UserStats>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account(zero_copy(unsafe))]
#[repr(packed)]
#[derive(Default, Debug)]
pub struct DepositState {
    pub owner: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub fee_percent: u8,
    pub total_interest: u64,
    pub payment_frequency: u64,
    pub loan_term_months: u64,
    pub maturity_date: i64,
    pub agreement_hash: [u8; 32],
}

pub fn process_deposit(ctx: Context<Deposit>, amount: u64, agreement_hash: [u8; 32]) -> Result<()> {
    // Load the pool account once
    let pool = &mut ctx.accounts.pool.load_mut()?;

    // Check if pool is paused
    if pool.is_paused {
        return Err(ErrorCode::PoolPaused.into());
    }

    // Verify agreement hash matches pool template
    require!(
        agreement_hash == pool.agreement_template_hash,
        ErrorCode::InvalidAgreement
    );

    // Fetch fee_percent from the pool state
    let fee_percent = pool.fee_percent;

    // Fee calculation with overflow protection
    let fee = amount
        .checked_mul(fee_percent)
        .and_then(|v| v.checked_div(100))
        .ok_or(ErrorCode::ArithmeticError)?;

    let net_amount = amount.checked_sub(fee).ok_or(ErrorCode::ArithmeticError)?;

    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, net_amount)?;

    // Initialize deposit
    let deposit = &mut ctx.accounts.deposit.load_init()?;
    deposit.owner = *ctx.accounts.payer.key;
    deposit.amount = net_amount;
    deposit.agreement_hash = agreement_hash;
    deposit.start_time = Clock::get()?.unix_timestamp;
    deposit.fee_percent = fee_percent as u8; // Store fee_percent in deposit state
    deposit.maturity_date = deposit.start_time + (pool.loan_term_months as i64) * 30 * 86400;

    // Calculate total interest
    deposit.total_interest = net_amount
        .checked_mul(pool.interest_rate)
        .and_then(|v| v.checked_mul(pool.loan_term_months))
        .and_then(|v| v.checked_div(12 * 100))
        .ok_or(ErrorCode::ArithmeticError)?;

    // Update pool state
    pool.deposit_count += 1;

    Ok(())
}
