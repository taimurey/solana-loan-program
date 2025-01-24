use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[account(zero_copy(unsafe))]
#[repr(packed)]
#[derive(Default, Debug)]
pub struct Pool {
    pub admin: Pubkey,
    pub name: [u8; 32],
    pub interest_rate: u64,
    pub loan_term_months: u64,
    pub payment_frequency: u64,
    pub is_paused: bool,
    pub deposit_count: u64,
    pub vault_bump: u8,
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Pool>(),
        seeds = [b"pool", admin.key.as_ref()],
        bump
    )]
    pub pool: AccountLoader<'info, Pool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    /// CHECK:
    #[account(
        seeds = [b"vault_authority", pool.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePool<'info> {
    pub fn initialize_vault_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, anchor_spl::token::InitializeAccount<'info>> {
        let cpi_accounts = anchor_spl::token::InitializeAccount {
            account: self.pool_vault.to_account_info(),
            mint: self.token_mint.to_account_info(),
            authority: self.vault_authority.to_account_info(),
            rent: self.system_program.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

pub fn process_create_pool(
    ctx: Context<CreatePool>,
    name: String,
    interest_rate: u64,
    loan_term_months: u64,
    payment_frequency: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool.load_init()?;
    pool.admin = *ctx.accounts.admin.key;

    // Convert the String to a fixed-size array [u8; 32]
    let mut name_array = [0u8; 32];
    let name_bytes = name.as_bytes();
    let len = name_bytes.len().min(32);
    name_array[..len].copy_from_slice(&name_bytes[..len]);

    pool.name = name_array;
    pool.interest_rate = interest_rate;
    pool.loan_term_months = loan_term_months;
    pool.payment_frequency = payment_frequency;
    pool.is_paused = false;
    pool.deposit_count = 0;

    token::initialize_account(ctx.accounts.initialize_vault_context())
}
