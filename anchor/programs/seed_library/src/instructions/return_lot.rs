use anchor_lang::prelude::*;

use crate::error::SeedLibraryError;
use crate::state::{Library, Loan, LoanStatus, Lot, Member, MAX_NOTE_LEN};

#[derive(Accounts)]
pub struct ReturnLot<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut)]
    pub library: Account<'info, Library>,
    #[account(
        mut,
        seeds = [b"member", library.key().as_ref(), wallet.key().as_ref()],
        bump = member.bump,
    )]
    pub member: Account<'info, Member>,
    #[account(
        mut,
        has_one = member @ SeedLibraryError::NotBorrower,
        // Lineage integrity: the child's parent must be the lot actually borrowed.
        has_one = lot @ SeedLibraryError::WrongLot,
        constraint = loan.status == LoanStatus::Open @ SeedLibraryError::LoanNotOpen,
    )]
    pub loan: Account<'info, Loan>,
    /// The lot that was borrowed: the parent of the returned seed.
    pub lot: Account<'info, Lot>,
    #[account(
        init,
        payer = wallet,
        space = 8 + Lot::INIT_SPACE,
        seeds = [b"lot", library.key().as_ref(), &library.lot_count.to_le_bytes()],
        bump,
    )]
    pub child_lot: Account<'info, Lot>,
    pub system_program: Program<'info, System>,
}

impl<'info> ReturnLot<'info> {
    /// Returns saved seed. The seed becomes a new lot whose parent is the lot
    /// that was borrowed, one generation later. Closes the loan and reopens
    /// the member's borrow gate.
    pub fn return_lot(
        &mut self,
        qty: u32,
        photo_hash: [u8; 32],
        note: String,
        bump: u8,
    ) -> Result<()> {
        require!(qty > 0, SeedLibraryError::InvalidQuantity);
        require!(photo_hash != [0u8; 32], SeedLibraryError::MissingPhoto);
        require!(note.len() <= MAX_NOTE_LEN, SeedLibraryError::NoteTooLong);

        let id = self.library.lot_count;
        self.child_lot.set_inner(Lot {
            library: self.library.key(),
            id,
            variety: self.lot.variety.clone(),
            qty_available: qty,
            parent: Some(self.lot.key()),
            generation: self
                .lot
                .generation
                .checked_add(1)
                .ok_or(SeedLibraryError::Overflow)?,
            contributor: self.wallet.key(),
            photo_hash,
            note,
            created_at: Clock::get()?.unix_timestamp,
            bump,
        });
        self.library.lot_count = id.checked_add(1).ok_or(SeedLibraryError::Overflow)?;

        self.loan.status = LoanStatus::Returned;
        self.loan.child_lot = Some(self.child_lot.key());

        self.member.open_loans = 0;
        self.member.returned = self
            .member
            .returned
            .checked_add(1)
            .ok_or(SeedLibraryError::Overflow)?;
        Ok(())
    }
}
