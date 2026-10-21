use anchor_lang::prelude::*;

use crate::error::SeedLibraryError;
use crate::state::{Library, MAX_NAME_LEN};

#[derive(Accounts)]
pub struct InitLibrary<'info> {
    #[account(mut)]
    pub steward: Signer<'info>,
    #[account(
        init,
        payer = steward,
        space = 8 + Library::INIT_SPACE,
        seeds = [b"library", steward.key().as_ref()],
        bump,
    )]
    pub library: Account<'info, Library>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitLibrary<'info> {
    pub fn init_library(&mut self, name: String, bump: u8) -> Result<()> {
        require!(
            !name.is_empty() && name.len() <= MAX_NAME_LEN,
            SeedLibraryError::InvalidName
        );

        self.library.set_inner(Library {
            steward: self.steward.key(),
            name,
            lot_count: 0,
            member_count: 0,
            bump,
        });
        Ok(())
    }
}
