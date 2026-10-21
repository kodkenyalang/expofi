use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

#[cfg(test)]
mod tests;

declare_id!("EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby");

#[program]
pub mod seed_library {
    use super::*;

    pub fn init_library(ctx: Context<InitLibrary>, name: String) -> Result<()> {
        ctx.accounts.init_library(name, ctx.bumps.library)
    }

    pub fn join(ctx: Context<Join>) -> Result<()> {
        ctx.accounts.join(ctx.bumps.member)
    }

    pub fn add_lot(
        ctx: Context<AddLot>,
        variety: String,
        qty: u32,
        photo_hash: [u8; 32],
        note: String,
    ) -> Result<()> {
        ctx.accounts
            .add_lot(variety, qty, photo_hash, note, ctx.bumps.lot)
    }

    pub fn borrow(ctx: Context<Borrow>, qty: u32) -> Result<()> {
        ctx.accounts.borrow(qty, ctx.bumps.loan)
    }

    pub fn return_lot(
        ctx: Context<ReturnLot>,
        qty: u32,
        photo_hash: [u8; 32],
        note: String,
    ) -> Result<()> {
        ctx.accounts
            .return_lot(qty, photo_hash, note, ctx.bumps.child_lot)
    }
}
