use anchor_lang::prelude::*;

use crate::error::SeedLibraryError;
use crate::state::{Library, Lot, MAX_NOTE_LEN, MAX_VARIETY_LEN};

#[derive(Accounts)]
pub struct AddLot<'info> {
    #[account(mut)]
    pub steward: Signer<'info>,
    #[account(mut, has_one = steward @ SeedLibraryError::NotSteward)]
    pub library: Account<'info, Library>,
    #[account(
        init,
        payer = steward,
        space = 8 + Lot::INIT_SPACE,
        seeds = [b"lot", library.key().as_ref(), &library.lot_count.to_le_bytes()],
        bump,
    )]
    pub lot: Account<'info, Lot>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddLot<'info> {
    /// Adds a root lot: seed that enters the library from outside, so it has
    /// no parent and is generation 0.
    pub fn add_lot(
        &mut self,
        variety: String,
        qty: u32,
        photo_hash: [u8; 32],
        note: String,
        bump: u8,
    ) -> Result<()> {
        require!(
            !variety.is_empty() && variety.len() <= MAX_VARIETY_LEN,
            SeedLibraryError::InvalidVariety
        );
        require!(note.len() <= MAX_NOTE_LEN, SeedLibraryError::NoteTooLong);
        require!(qty > 0, SeedLibraryError::InvalidQuantity);

        let id = self.library.lot_count;
        self.lot.set_inner(Lot {
            library: self.library.key(),
            id,
            variety,
            qty_available: qty,
            parent: None,
            generation: 0,
            contributor: self.steward.key(),
            photo_hash,
            note,
            created_at: Clock::get()?.unix_timestamp,
            bump,
        });
        self.library.lot_count = id.checked_add(1).ok_or(SeedLibraryError::Overflow)?;
        Ok(())
    }
}
