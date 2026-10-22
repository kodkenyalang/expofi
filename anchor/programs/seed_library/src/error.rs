use anchor_lang::prelude::*;

// Text limits are in bytes, because that is what account space is measured in.
// Non-Latin scripts use 2-4 bytes per character, so the UI must count bytes too.
#[error_code]
pub enum SeedLibraryError {
    #[msg("Name must be 1 to 32 bytes (fewer characters in non-Latin scripts)")]
    InvalidName,
    #[msg("Variety must be 1 to 32 bytes (fewer characters in non-Latin scripts)")]
    InvalidVariety,
    #[msg("Note must be at most 80 bytes (fewer characters in non-Latin scripts)")]
    NoteTooLong,
    #[msg("Quantity must be greater than zero")]
    InvalidQuantity,
    #[msg("Only the library steward can do this")]
    NotSteward,
    #[msg("This account belongs to a different library")]
    WrongLibrary,
    #[msg("You have an open loan. Return your seed before borrowing again")]
    BorrowBlocked,
    #[msg("Not enough seed left in this lot")]
    InsufficientSeed,
    #[msg("This loan is not open")]
    LoanNotOpen,
    #[msg("This loan belongs to another member")]
    NotBorrower,
    #[msg("Returned seed needs a photo")]
    MissingPhoto,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Returned seed must name the lot that was borrowed as its parent")]
    WrongLot,
}
