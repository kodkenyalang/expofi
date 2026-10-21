use anchor_lang::prelude::*;

use crate::error::SeedLibraryError;
use crate::state::{Library, Loan, LoanStatus, Lot, Member};

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub library: Account<'info, Library>,
    #[account(
        mut,
        seeds = [b"member", library.key().as_ref(), wallet.key().as_ref()],
        bump = member.bump,
    )]
    pub member: Account<'info, Member>,
    #[account(mut, has_one = library @ SeedLibraryError::WrongLibrary)]
    pub lot: Account<'info, Lot>,
    #[account(
        init,
        payer = wallet,
        space = 8 + Loan::INIT_SPACE,
        seeds = [b"loan", member.key().as_ref(), &member.loan_count.to_le_bytes()],
        bump,
    )]
    pub loan: Account<'info, Loan>,
    pub system_program: Program<'info, System>,
}

impl<'info> Borrow<'info> {
    pub fn borrow(&mut self, qty: u32, bump: u8) -> Result<()> {
        // The borrow gate. Enforced here, not in the UI.
        require!(self.member.open_loans == 0, SeedLibraryError::BorrowBlocked);
        require!(qty > 0, SeedLibraryError::InvalidQuantity);
        require!(
            qty <= self.lot.qty_available,
            SeedLibraryError::InsufficientSeed
        );

        let index = self.member.loan_count;
        self.loan.set_inner(Loan {
            library: self.library.key(),
            member: self.member.key(),
            lot: self.lot.key(),
            index,
            qty,
            borrowed_at: Clock::get()?.unix_timestamp,
            status: LoanStatus::Open,
            child_lot: None,
            bump,
        });

        self.lot.qty_available -= qty;
        self.member.open_loans = 1;
        self.member.loan_count = index.checked_add(1).ok_or(SeedLibraryError::Overflow)?;
        Ok(())
    }
}
