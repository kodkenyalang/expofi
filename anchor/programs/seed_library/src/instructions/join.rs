use anchor_lang::prelude::*;

use crate::error::SeedLibraryError;
use crate::state::{Library, Member};

#[derive(Accounts)]
pub struct Join<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut)]
    pub library: Account<'info, Library>,
    #[account(
        init,
        payer = wallet,
        space = 8 + Member::INIT_SPACE,
        seeds = [b"member", library.key().as_ref(), wallet.key().as_ref()],
        bump,
    )]
    pub member: Account<'info, Member>,
    pub system_program: Program<'info, System>,
}

impl<'info> Join<'info> {
    pub fn join(&mut self, bump: u8) -> Result<()> {
        self.member.set_inner(Member {
            library: self.library.key(),
            wallet: self.wallet.key(),
            open_loans: 0,
            loan_count: 0,
            returned: 0,
            bump,
        });
        self.library.member_count = self
            .library
            .member_count
            .checked_add(1)
            .ok_or(SeedLibraryError::Overflow)?;
        Ok(())
    }
}
