use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token::{Mint, Token, TokenAccount},
    token_2022::{
        self, initialize_account3,
        spl_token_2022::{
            self,
            extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
        },
        InitializeAccount3,
    },
};

#[account(zero_copy(unsafe))]
#[repr(packed)]
#[derive(Default, Debug)]
pub struct Pool {
    pub admin: Pubkey,
    pub name: [u8; 32],
    pub agreement_template_hash: [u8; 32],
    pub interest_rate: u64,
    pub loan_term_months: u64,
    pub payment_frequency: u64,
    pub is_paused: bool,
    pub deposit_count: u64,
    pub fee_percent: u64, // Add fee_percent to the Pool struct
    pub vault_bump: u8,
}

pub const POOL_MINT_SEED: &str = "pool_mint";
pub const VAULT_AUTHORITY: &str = "vault_authority";
pub const POOL_VAULT: &str = "vault";

#[derive(Accounts)]
#[instruction(
    name: String,
    interest_rate: u64,
    loan_term_months: u64,
    payment_frequency: u64,
    agreement_template_hash: [u8; 32],
)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Pool>(),
        seeds = [b"pool", token_mint.key().as_ref(), &agreement_template_hash],
        bump
    )]
    pub pool: AccountLoader<'info, Pool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    /// CHECK:
    #[account(
        mut,
        seeds = [POOL_VAULT.as_bytes(), pool.key().as_ref()],
        bump,
    )]
    pub pool_vault: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        seeds = [VAULT_AUTHORITY.as_bytes(), pool.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub const MINT_WHITELIST: [&'static str; 2] = [
    "So11111111111111111111111111111111111111112",  // SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USD
];

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
    agreement_template_hash: [u8; 32],
) -> Result<()> {
    // Step 1: Check if the token_mint is in the whitelist
    let token_mint_key = ctx.accounts.token_mint.key().to_string();
    if !MINT_WHITELIST.contains(&token_mint_key.as_str()) {
        return Err(ErrorCode::InvalidTokenMint.into());
    }

    // Step 2: Assign fee_percent based on the token type
    let fee_percent = match token_mint_key.as_str() {
        "So11111111111111111111111111111111111111112" => 5, // SOL: 5% fee
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" => 3, // USD: 3% fee
        _ => unreachable!(), // This case is already handled by the whitelist check
    };

    // Step 3: Initialize the pool account
    let pool = &mut ctx.accounts.pool.load_init()?;
    pool.admin = *ctx.accounts.admin.key;
    pool.agreement_template_hash = agreement_template_hash;

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
    pool.fee_percent = fee_percent; // Set the fee_percent

    // Step 4: Create the token account for the pool vault
    create_token_account(
        &ctx.accounts.vault_authority.to_account_info(),
        &ctx.accounts.creator.to_account_info(),
        &ctx.accounts.pool_vault.to_account_info(),
        &ctx.accounts.token_mint.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        &[
            POOL_VAULT.as_bytes(),
            ctx.accounts.pool.key().as_ref(),
            &[ctx.bumps.pool_vault][..],
        ],
    )?;

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided token mint is not whitelisted.")]
    InvalidTokenMint,
}

pub fn create_token_account<'a>(
    authority: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    token_account: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let space = {
        let mint_info = mint_account.to_account_info();
        if *mint_info.owner == token_2022::Token2022::id() {
            let mint_data = mint_info.try_borrow_data()?;
            let mint_state =
                StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;
            let mint_extensions = mint_state.get_extension_types()?;
            let required_extensions =
                ExtensionType::get_required_init_account_extensions(&mint_extensions);
            ExtensionType::try_calculate_account_len::<spl_token_2022::state::Account>(
                &required_extensions,
            )?
        } else {
            TokenAccount::LEN
        }
    };
    create_or_allocate_account(
        token_program.key,
        payer.to_account_info(),
        system_program.to_account_info(),
        token_account.to_account_info(),
        signer_seeds,
        space,
    )?;
    initialize_account3(CpiContext::new(
        token_program.to_account_info(),
        InitializeAccount3 {
            account: token_account.to_account_info(),
            mint: mint_account.to_account_info(),
            authority: authority.to_account_info(),
        },
    ))
}

pub fn create_or_allocate_account<'a>(
    program_id: &Pubkey,
    payer: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    target_account: AccountInfo<'a>,
    siger_seed: &[&[u8]],
    space: usize,
) -> Result<()> {
    let rent = Rent::get()?;
    let current_lamports = target_account.lamports();

    if current_lamports == 0 {
        let lamports = rent.minimum_balance(space);
        let cpi_accounts = system_program::CreateAccount {
            from: payer,
            to: target_account.clone(),
        };
        let cpi_context = CpiContext::new(system_program.clone(), cpi_accounts);
        system_program::create_account(
            cpi_context.with_signer(&[siger_seed]),
            lamports,
            u64::try_from(space).unwrap(),
            program_id,
        )?;
    } else {
        let required_lamports = rent
            .minimum_balance(space)
            .max(1)
            .saturating_sub(current_lamports);
        if required_lamports > 0 {
            let cpi_accounts = system_program::Transfer {
                from: payer.to_account_info(),
                to: target_account.clone(),
            };
            let cpi_context = CpiContext::new(system_program.clone(), cpi_accounts);
            system_program::transfer(cpi_context, required_lamports)?;
        }
        let cpi_accounts = system_program::Allocate {
            account_to_allocate: target_account.clone(),
        };
        let cpi_context = CpiContext::new(system_program.clone(), cpi_accounts);
        system_program::allocate(
            cpi_context.with_signer(&[siger_seed]),
            u64::try_from(space).unwrap(),
        )?;

        let cpi_accounts = system_program::Assign {
            account_to_assign: target_account.clone(),
        };
        let cpi_context = CpiContext::new(system_program.clone(), cpi_accounts);
        system_program::assign(cpi_context.with_signer(&[siger_seed]), program_id)?;
    }
    Ok(())
}
