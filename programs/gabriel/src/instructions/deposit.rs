use super::{Pool, UserStats};
use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<Deposit>(),
        seeds = [b"deposit", user.key.as_ref(), pool.key().as_ref(), &[pool.load()?.deposit_count.try_into().unwrap()]],
        bump
    )]
    pub deposit: AccountLoader<'info, DepositState>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump = pool.load()?.vault_bump,
        token::mint = token_mint,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<UserStats>(),
        seeds = [b"user_stats", user.key.as_ref()],
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
}

pub fn process_deposit(
    ctx: Context<Deposit>,
    amount: u64,
    fee_percent: u8,
    agreement_hash: [u8; 32],
) -> Result<()> {
    // Fee calculation with overflow protection
    let fee = amount
        .checked_mul(u64::from(fee_percent))
        .and_then(|v| v.checked_div(100))
        .ok_or(ErrorCode::ArithmeticError)?;

    let net_amount = amount.checked_sub(fee).ok_or(ErrorCode::ArithmeticError)?;

    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, net_amount)?;

    // Initialize deposit
    let deposit = &mut ctx.accounts.deposit.load_init()?;
    deposit.owner = *ctx.accounts.user.key;
    deposit.amount = net_amount;
    deposit.start_time = Clock::get()?.unix_timestamp;
    deposit.fee_percent = fee_percent;
    deposit.total_interest = net_amount
        .checked_mul(ctx.accounts.pool.load()?.interest_rate)
        .and_then(|v| v.checked_mul(ctx.accounts.pool.load().ok()?.loan_term_months))
        .and_then(|v| v.checked_div(12 * 100))
        .ok_or(ErrorCode::ArithmeticError)?;

    let pool = &mut ctx.accounts.pool.load_mut()?;
    pool.deposit_count += 1;
    Ok(())
}
