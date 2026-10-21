use anchor_lang::prelude::*;

pub const MAX_NAME_LEN: usize = 32;
pub const MAX_VARIETY_LEN: usize = 32;
pub const MAX_NOTE_LEN: usize = 80;

/// One seed library, run by a single steward key.
#[account]
#[derive(InitSpace)]
pub struct Library {
    pub steward: Pubkey,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    /// Next lot id. Root lots and returned (child) lots share one sequence.
    pub lot_count: u64,
    pub member_count: u32,
    pub bump: u8,
}

/// A wallet's membership of one library.
#[account]
#[derive(InitSpace)]
pub struct Member {
    pub library: Pubkey,
    pub wallet: Pubkey,
    /// The borrow gate: a member may only borrow while this is 0.
    pub open_loans: u8,
    /// Next loan index for this member, used in the loan PDA seeds.
    pub loan_count: u32,
    pub returned: u32,
    pub bump: u8,
}

/// A packet of seed. Root lots come from the steward; child lots are offspring
/// returned by a member and point at the lot they were grown from.
#[account]
#[derive(InitSpace)]
pub struct Lot {
    pub library: Pubkey,
    pub id: u64,
    #[max_len(MAX_VARIETY_LEN)]
    pub variety: String,
    pub qty_available: u32,
    pub parent: Option<Pubkey>,
    pub generation: u16,
    /// Who put this seed in the library: the steward for root lots, the
    /// grower for child lots.
    pub contributor: Pubkey,
    /// sha256 of the photo, which is stored off-chain.
    pub photo_hash: [u8; 32],
    #[max_len(MAX_NOTE_LEN)]
    pub note: String,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum LoanStatus {
    Open,
    Returned,
    Forgiven,
}

/// One borrow of one lot by one member.
#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub library: Pubkey,
    pub member: Pubkey,
    pub lot: Pubkey,
    pub index: u32,
    pub qty: u32,
    pub borrowed_at: i64,
    pub status: LoanStatus,
    pub child_lot: Option<Pubkey>,
    pub bump: u8,
}
