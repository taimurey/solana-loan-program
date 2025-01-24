use anchor_lang::prelude::*;

use crate::instructions::DepositState;

pub fn calculate_available_interest(deposit: &DepositState) -> Result<u64> {
    let current_time = Clock::get()?.unix_timestamp;
    let elapsed = current_time - deposit.start_time;
    let months_elapsed = elapsed / 2_592_000; // 30 days

    let periods = months_elapsed / deposit.payment_frequency as i64;
    let interest_per_period = deposit.total_interest / deposit.loan_term_months;

    Ok(periods as u64 * interest_per_period)
}
