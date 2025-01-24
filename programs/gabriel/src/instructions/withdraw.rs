use crate::calculator::interest::calculate_available_interest;
use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use super::{DepositState, Pool};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub deposit: AccountLoader<'info, DepositState>,

    #[account(mut)]
    pub user_stats: AccountLoader<'info, UserStats>,

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

    /// CHECK:
    #[account(
        seeds = [b"vault_authority", pool.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub pool: AccountLoader<'info, Pool>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account(zero_copy(unsafe))]
#[repr(packed)]
#[derive(Default, Debug)]
pub struct UserStats {
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub available_for_withdraw: u64,
}

pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let deposit = ctx.accounts.deposit.load_mut()?;
    let available = calculate_available_interest(&deposit)?;
    require!(amount <= available, ErrorCode::InsufficientFunds);

    // Transfer tokens from vault
    let seeds = &[
        b"vault".as_ref(),
        &ctx.accounts.pool.key().to_bytes(),
        &[ctx.accounts.pool.load()?.vault_bump],
    ];
    let signer = [&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.pool_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        &signer,
    );
    token::transfer(cpi_ctx, amount)?;

    // Update user stats
    let user_stats = &mut ctx.accounts.user_stats.load_mut()?;
    user_stats.available_for_withdraw = user_stats
        .available_for_withdraw
        .checked_sub(amount)
        .ok_or(ErrorCode::ArithmeticError)?;

    user_stats.total_withdrawn = user_stats
        .total_withdrawn
        .checked_add(amount)
        .ok_or(ErrorCode::ArithmeticError)?;

    Ok(())
}
