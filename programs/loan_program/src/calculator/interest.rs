use crate::error::ErrorCode;
use crate::instructions::DepositState;
use anchor_lang::prelude::*;

pub fn calculate_available_interest(deposit: &DepositState, current_time: i64) -> Result<u64> {
    // Ensure loan term and payment frequency are valid
    require!(deposit.loan_term_months > 0, ErrorCode::InvalidLoanTerm);
    require!(
        deposit.payment_frequency > 0,
        ErrorCode::InvalidPaymentFrequency
    );

    // Calculate elapsed time since deposit
    let elapsed_time = current_time - deposit.start_time;

    // Convert elapsed time to months (30 days per month)
    let months_elapsed = elapsed_time / 2_592_000; // 30 days in seconds
    let months_elapsed = std::cmp::min(months_elapsed, deposit.loan_term_months as i64);

    // Calculate the number of payment periods elapsed
    let periods_elapsed = months_elapsed / deposit.payment_frequency as i64;

    // Calculate interest per period (total interest / total periods)
    let interest_per_period = deposit
        .total_interest
        .checked_div(deposit.loan_term_months)
        .ok_or(ErrorCode::ArithmeticError)?;

    // Total available interest = periods_elapsed * interest_per_period
    Ok(periods_elapsed as u64 * interest_per_period)
}

#[test]
fn test_calculate_available_interest() {
    let deposit = DepositState {
        amount: 100,
        loan_term_months: 8,
        payment_frequency: 1,
        total_interest: 16, // Total interest over 8 months
        start_time: 0,
        ..Default::default()
    };

    // Simulate 3 months later
    let current_time = 3 * 30 * 86400; // 7,776,000 seconds

    let available = calculate_available_interest(&deposit, current_time).unwrap();
    assert_eq!(available, 6); // 3 months * (16 / 8) = 6
}
