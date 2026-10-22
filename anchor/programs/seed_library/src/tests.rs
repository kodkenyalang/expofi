#[cfg(test)]
mod tests {
    use crate::error::SeedLibraryError;
    use crate::state::{Library, Loan, LoanStatus, Lot, Member};
    use crate::ID as PROGRAM_ID;
    use anchor_lang::{
        error::ERROR_CODE_OFFSET, system_program, AccountDeserialize, InstructionData,
        ToAccountMetas,
    };
    use litesvm::{types::TransactionResult, LiteSVM};
    use solana_sdk::{
        instruction::{Instruction, InstructionError},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        transaction::{Transaction, TransactionError},
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const PHOTO: [u8; 32] = [7u8; 32];

    // ---------- PDAs ----------

    fn library_pda(steward: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[b"library", steward.as_ref()], &PROGRAM_ID).0
    }

    fn member_pda(library: &Pubkey, wallet: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[b"member", library.as_ref(), wallet.as_ref()], &PROGRAM_ID).0
    }

    fn lot_pda(library: &Pubkey, id: u64) -> Pubkey {
        Pubkey::find_program_address(&[b"lot", library.as_ref(), &id.to_le_bytes()], &PROGRAM_ID).0
    }

    fn loan_pda(member: &Pubkey, index: u32) -> Pubkey {
        Pubkey::find_program_address(
            &[b"loan", member.as_ref(), &index.to_le_bytes()],
            &PROGRAM_ID,
        )
        .0
    }

    // ---------- Harness ----------

    fn setup() -> LiteSVM {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/seed_library.so");
        svm.add_program(PROGRAM_ID, program_bytes).unwrap();
        svm
    }

    fn funded(svm: &mut LiteSVM) -> Keypair {
        let kp = Keypair::new();
        svm.airdrop(&kp.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        kp
    }

    fn send(svm: &mut LiteSVM, ix: Instruction, signer: &Keypair) -> TransactionResult {
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&signer.pubkey()),
            &[signer],
            svm.latest_blockhash(),
        );
        let result = svm.send_transaction(tx);
        svm.expire_blockhash();
        result
    }

    fn fetch<T: AccountDeserialize>(svm: &LiteSVM, address: &Pubkey) -> T {
        let account = svm.get_account(address).expect("account should exist");
        T::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    fn assert_err(result: TransactionResult, expected: SeedLibraryError) {
        let err = result.expect_err("transaction should fail").err;
        let code = expected as u32 + ERROR_CODE_OFFSET;
        assert_eq!(
            err,
            TransactionError::InstructionError(0, InstructionError::Custom(code)),
        );
    }

    /// For errors raised by Anchor or the runtime rather than SeedLibraryError.
    fn assert_code(result: TransactionResult, code: u32) {
        let err = result.expect_err("transaction should fail").err;
        assert_eq!(
            err,
            TransactionError::InstructionError(0, InstructionError::Custom(code)),
        );
    }

    fn compute_units(result: &TransactionResult) -> u64 {
        match result {
            Ok(meta) => meta.compute_units_consumed,
            Err(failed) => failed.meta.compute_units_consumed,
        }
    }

    // ---------- Instructions ----------

    fn init_library(svm: &mut LiteSVM, steward: &Keypair, name: &str) -> TransactionResult {
        let ix = Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::InitLibrary {
                steward: steward.pubkey(),
                library: library_pda(&steward.pubkey()),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::InitLibrary {
                name: name.to_string(),
            }
            .data(),
        };
        send(svm, ix, steward)
    }

    fn join(svm: &mut LiteSVM, library: &Pubkey, wallet: &Keypair) -> TransactionResult {
        let ix = Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::Join {
                wallet: wallet.pubkey(),
                library: *library,
                member: member_pda(library, &wallet.pubkey()),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::Join {}.data(),
        };
        send(svm, ix, wallet)
    }

    fn add_lot_ix(
        steward: &Pubkey,
        library: &Pubkey,
        id: u64,
        variety: &str,
        qty: u32,
        note: &str,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::AddLot {
                steward: *steward,
                library: *library,
                lot: lot_pda(library, id),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::AddLot {
                variety: variety.to_string(),
                qty,
                photo_hash: PHOTO,
                note: note.to_string(),
            }
            .data(),
        }
    }

    fn add_lot(
        svm: &mut LiteSVM,
        signer: &Keypair,
        library: &Pubkey,
        variety: &str,
        qty: u32,
    ) -> TransactionResult {
        let id = fetch::<Library>(svm, library).lot_count;
        let ix = add_lot_ix(
            &signer.pubkey(),
            library,
            id,
            variety,
            qty,
            "Donated by the founding members",
        );
        send(svm, ix, signer)
    }

    fn borrow(
        svm: &mut LiteSVM,
        wallet: &Keypair,
        library: &Pubkey,
        lot: &Pubkey,
        qty: u32,
    ) -> TransactionResult {
        let member = member_pda(library, &wallet.pubkey());
        let index = fetch::<Member>(svm, &member).loan_count;
        let ix = Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::Borrow {
                wallet: wallet.pubkey(),
                library: *library,
                member,
                lot: *lot,
                loan: loan_pda(&member, index),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::Borrow { qty }.data(),
        };
        send(svm, ix, wallet)
    }

    #[allow(clippy::too_many_arguments)]
    fn return_lot_ix(
        wallet: &Pubkey,
        library: &Pubkey,
        loan: &Pubkey,
        lot: &Pubkey,
        child_id: u64,
        qty: u32,
        photo_hash: [u8; 32],
        note: &str,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::ReturnLot {
                wallet: *wallet,
                library: *library,
                member: member_pda(library, wallet),
                loan: *loan,
                lot: *lot,
                child_lot: lot_pda(library, child_id),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::ReturnLot {
                qty,
                photo_hash,
                note: note.to_string(),
            }
            .data(),
        }
    }

    /// Returns a loan the way an honest client would: parent = the loan's lot,
    /// child id = the library's current lot_count.
    fn return_lot(
        svm: &mut LiteSVM,
        wallet: &Keypair,
        library: &Pubkey,
        loan: &Pubkey,
        qty: u32,
        photo_hash: [u8; 32],
    ) -> TransactionResult {
        let lot = fetch::<Loan>(svm, loan).lot;
        let child_id = fetch::<Library>(svm, library).lot_count;
        let ix = return_lot_ix(
            &wallet.pubkey(),
            library,
            loan,
            &lot,
            child_id,
            qty,
            photo_hash,
            "18/20 germinated",
        );
        send(svm, ix, wallet)
    }

    /// A library with one root lot of 100 bean seeds and one member, Sam.
    struct World {
        svm: LiteSVM,
        steward: Keypair,
        library: Pubkey,
        root_lot: Pubkey,
        sam: Keypair,
    }

    fn world() -> World {
        let mut svm = setup();
        let steward = funded(&mut svm);
        init_library(&mut svm, &steward, "Allotment Seed Tin").unwrap();
        let library = library_pda(&steward.pubkey());
        add_lot(&mut svm, &steward, &library, "Borlotti bean", 100).unwrap();
        let root_lot = lot_pda(&library, 0);
        let sam = funded(&mut svm);
        join(&mut svm, &library, &sam).unwrap();
        World {
            svm,
            steward,
            library,
            root_lot,
            sam,
        }
    }

    // ---------- Day 2: library, members, lots ----------

    #[test]
    fn init_library_join_and_add_root_lot() {
        let w = world();

        let library: Library = fetch(&w.svm, &w.library);
        assert_eq!(library.steward, w.steward.pubkey());
        assert_eq!(library.name, "Allotment Seed Tin");
        assert_eq!(library.lot_count, 1);
        assert_eq!(library.member_count, 1);

        let lot: Lot = fetch(&w.svm, &w.root_lot);
        assert_eq!(lot.library, w.library);
        assert_eq!(lot.variety, "Borlotti bean");
        assert_eq!(lot.qty_available, 100);
        assert_eq!(lot.parent, None);
        assert_eq!(lot.generation, 0);
        assert_eq!(lot.contributor, w.steward.pubkey());

        let member: Member = fetch(&w.svm, &member_pda(&w.library, &w.sam.pubkey()));
        assert_eq!(member.wallet, w.sam.pubkey());
        assert_eq!(member.open_loans, 0);
    }

    #[test]
    fn init_library_rejects_empty_and_long_names() {
        let mut svm = setup();
        let steward = funded(&mut svm);
        assert_err(
            init_library(&mut svm, &steward, ""),
            SeedLibraryError::InvalidName,
        );
        assert_err(
            init_library(&mut svm, &steward, &"x".repeat(33)),
            SeedLibraryError::InvalidName,
        );
    }

    #[test]
    fn add_lot_rejects_non_steward() {
        let mut w = world();
        let intruder = funded(&mut w.svm);
        assert_err(
            add_lot(&mut w.svm, &intruder, &w.library, "Fake bean", 10),
            SeedLibraryError::NotSteward,
        );
    }

    #[test]
    fn add_lot_rejects_zero_quantity() {
        let mut w = world();
        let steward = w.steward.insecure_clone();
        assert_err(
            add_lot(&mut w.svm, &steward, &w.library, "Kale", 0),
            SeedLibraryError::InvalidQuantity,
        );
    }

    #[test]
    fn join_twice_fails() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        assert!(join(&mut w.svm, &w.library, &sam).is_err());
    }

    // ---------- Day 3: borrow gate and lineage ----------

    #[test]
    fn borrow_then_return_creates_child_lot() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let member = member_pda(&w.library, &sam.pubkey());

        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 20).unwrap();
        let loan = loan_pda(&member, 0);
        assert_eq!(fetch::<Lot>(&w.svm, &w.root_lot).qty_available, 80);
        assert_eq!(fetch::<Member>(&w.svm, &member).open_loans, 1);
        assert_eq!(fetch::<Loan>(&w.svm, &loan).status, LoanStatus::Open);

        return_lot(&mut w.svm, &sam, &w.library, &loan, 60, PHOTO).unwrap();

        let child_address = lot_pda(&w.library, 1);
        let child: Lot = fetch(&w.svm, &child_address);
        assert_eq!(child.parent, Some(w.root_lot));
        assert_eq!(child.generation, 1);
        assert_eq!(child.variety, "Borlotti bean");
        assert_eq!(child.qty_available, 60);
        assert_eq!(child.contributor, sam.pubkey());
        assert_eq!(child.photo_hash, PHOTO);
        assert_eq!(child.note, "18/20 germinated");

        let loan: Loan = fetch(&w.svm, &loan);
        assert_eq!(loan.status, LoanStatus::Returned);
        assert_eq!(loan.child_lot, Some(child_address));

        let member: Member = fetch(&w.svm, &member);
        assert_eq!(member.open_loans, 0);
        assert_eq!(member.returned, 1);
        assert_eq!(fetch::<Library>(&w.svm, &w.library).lot_count, 2);
    }

    #[test]
    fn borrow_blocked_while_loan_open_and_reopens_after_return() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let member = member_pda(&w.library, &sam.pubkey());

        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        assert_err(
            borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10),
            SeedLibraryError::BorrowBlocked,
        );

        return_lot(
            &mut w.svm,
            &sam,
            &w.library,
            &loan_pda(&member, 0),
            30,
            PHOTO,
        )
        .unwrap();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        assert_eq!(fetch::<Member>(&w.svm, &member).loan_count, 2);
    }

    #[test]
    fn borrow_rejects_more_than_available_and_zero() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        assert_err(
            borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 101),
            SeedLibraryError::InsufficientSeed,
        );
        assert_err(
            borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 0),
            SeedLibraryError::InvalidQuantity,
        );
    }

    #[test]
    fn borrow_rejects_lot_from_another_library() {
        let mut w = world();
        let other_steward = funded(&mut w.svm);
        init_library(&mut w.svm, &other_steward, "Other Seed Swap").unwrap();
        let other_library = library_pda(&other_steward.pubkey());
        add_lot(&mut w.svm, &other_steward, &other_library, "Kale", 50).unwrap();
        let foreign_lot = lot_pda(&other_library, 0);

        let sam = w.sam.insecure_clone();
        assert_err(
            borrow(&mut w.svm, &sam, &w.library, &foreign_lot, 5),
            SeedLibraryError::WrongLibrary,
        );
    }

    #[test]
    fn return_by_non_borrower_rejected() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let alex = funded(&mut w.svm);
        join(&mut w.svm, &w.library, &alex).unwrap();

        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let sams_loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);

        assert_err(
            return_lot(&mut w.svm, &alex, &w.library, &sams_loan, 30, PHOTO),
            SeedLibraryError::NotBorrower,
        );
    }

    #[test]
    fn double_return_rejected() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);

        return_lot(&mut w.svm, &sam, &w.library, &loan, 30, PHOTO).unwrap();
        assert_err(
            return_lot(&mut w.svm, &sam, &w.library, &loan, 30, PHOTO),
            SeedLibraryError::LoanNotOpen,
        );
        assert_eq!(fetch::<Library>(&w.svm, &w.library).lot_count, 2);
    }

    #[test]
    fn return_without_photo_or_seed_rejected() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);

        assert_err(
            return_lot(&mut w.svm, &sam, &w.library, &loan, 30, [0u8; 32]),
            SeedLibraryError::MissingPhoto,
        );
        assert_err(
            return_lot(&mut w.svm, &sam, &w.library, &loan, 0, PHOTO),
            SeedLibraryError::InvalidQuantity,
        );
        assert_eq!(fetch::<Loan>(&w.svm, &loan).status, LoanStatus::Open);
    }

    #[test]
    fn lineage_spans_generations() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let alex = funded(&mut w.svm);
        join(&mut w.svm, &w.library, &alex).unwrap();

        // Sam grows the root lot; the saved seed becomes lot 1.
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let sam_member = member_pda(&w.library, &sam.pubkey());
        return_lot(
            &mut w.svm,
            &sam,
            &w.library,
            &loan_pda(&sam_member, 0),
            40,
            PHOTO,
        )
        .unwrap();
        let gen1 = lot_pda(&w.library, 1);

        // Alex grows Sam's seed; that becomes lot 2.
        borrow(&mut w.svm, &alex, &w.library, &gen1, 10).unwrap();
        let alex_member = member_pda(&w.library, &alex.pubkey());
        return_lot(
            &mut w.svm,
            &alex,
            &w.library,
            &loan_pda(&alex_member, 0),
            25,
            PHOTO,
        )
        .unwrap();
        let gen2: Lot = fetch(&w.svm, &lot_pda(&w.library, 2));

        assert_eq!(gen2.generation, 2);
        assert_eq!(gen2.parent, Some(gen1));
        assert_eq!(fetch::<Lot>(&w.svm, &gen1).parent, Some(w.root_lot));
        assert_eq!(gen2.contributor, alex.pubkey());
    }

    // ---------- Day 4: hardening from genchi genbutsu audit 3 ----------

    /// Anchor's ConstraintSeeds: the PDA passed doesn't match the seeds.
    const ANCHOR_CONSTRAINT_SEEDS: u32 = 2006;
    /// Anchor's AccountNotInitialized.
    const ANCHOR_ACCOUNT_NOT_INITIALIZED: u32 = 3012;
    /// System program "account already in use" (create_account on an existing account).
    const SYSTEM_ACCOUNT_IN_USE: u32 = 0;
    /// Measured max on 22 Oct was 22,961 CU (borrow). Budget leaves ~1.7x headroom.
    const CU_BUDGET: u64 = 40_000;

    #[test]
    fn return_claiming_wrong_parent_lot_rejected() {
        let mut w = world();
        let steward = w.steward.insecure_clone();
        add_lot(&mut w.svm, &steward, &w.library, "Heirloom tomato", 50).unwrap();
        let other_lot = lot_pda(&w.library, 1);

        let sam = w.sam.insecure_clone();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);

        // Sam borrowed beans but claims the offspring descend from the tomato.
        let ix = return_lot_ix(
            &sam.pubkey(),
            &w.library,
            &loan,
            &other_lot,
            2,
            30,
            PHOTO,
            "",
        );
        assert_err(send(&mut w.svm, ix, &sam), SeedLibraryError::WrongLot);
        assert_eq!(fetch::<Loan>(&w.svm, &loan).status, LoanStatus::Open);
    }

    #[test]
    fn add_lot_variety_limit_is_in_bytes() {
        let mut w = world();
        let steward = w.steward.insecure_clone();

        assert_err(
            add_lot(&mut w.svm, &steward, &w.library, "", 5),
            SeedLibraryError::InvalidVariety,
        );
        assert_err(
            add_lot(&mut w.svm, &steward, &w.library, &"a".repeat(33), 5),
            SeedLibraryError::InvalidVariety,
        );
        // 12 characters but 36 bytes: rejected. The UI must count bytes.
        assert_err(
            add_lot(&mut w.svm, &steward, &w.library, &"青菜".repeat(6), 5),
            SeedLibraryError::InvalidVariety,
        );
        // Boundaries that must pass: 32 ASCII bytes, and 10 CJK characters (30 bytes).
        add_lot(&mut w.svm, &steward, &w.library, &"a".repeat(32), 5).unwrap();
        add_lot(&mut w.svm, &steward, &w.library, &"青菜".repeat(5), 5).unwrap();
    }

    #[test]
    fn note_limit_enforced_on_add_and_return() {
        let mut w = world();
        let steward = w.steward.insecure_clone();
        let id = fetch::<Library>(&w.svm, &w.library).lot_count;
        let ix = add_lot_ix(
            &steward.pubkey(),
            &w.library,
            id,
            "Kale",
            5,
            &"n".repeat(81),
        );
        assert_err(
            send(&mut w.svm, ix, &steward),
            SeedLibraryError::NoteTooLong,
        );
        let ix = add_lot_ix(
            &steward.pubkey(),
            &w.library,
            id,
            "Kale",
            5,
            &"n".repeat(80),
        );
        send(&mut w.svm, ix, &steward).unwrap();

        let sam = w.sam.insecure_clone();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        let loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);
        let child_id = fetch::<Library>(&w.svm, &w.library).lot_count;
        let ix = return_lot_ix(
            &sam.pubkey(),
            &w.library,
            &loan,
            &w.root_lot,
            child_id,
            30,
            PHOTO,
            &"n".repeat(81),
        );
        assert_err(send(&mut w.svm, ix, &sam), SeedLibraryError::NoteTooLong);
    }

    #[test]
    fn init_library_twice_fails() {
        let mut w = world();
        let steward = w.steward.insecure_clone();
        assert_code(
            init_library(&mut w.svm, &steward, "Second tin"),
            SYSTEM_ACCOUNT_IN_USE,
        );
        assert_eq!(
            fetch::<Library>(&w.svm, &w.library).name,
            "Allotment Seed Tin"
        );
    }

    #[test]
    fn non_member_cannot_borrow() {
        let mut w = world();
        let stranger = funded(&mut w.svm);
        let member = member_pda(&w.library, &stranger.pubkey());
        let ix = Instruction {
            program_id: PROGRAM_ID,
            accounts: crate::accounts::Borrow {
                wallet: stranger.pubkey(),
                library: w.library,
                member,
                lot: w.root_lot,
                loan: loan_pda(&member, 0),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: crate::instruction::Borrow { qty: 1 }.data(),
        };
        assert_code(
            send(&mut w.svm, ix, &stranger),
            ANCHOR_ACCOUNT_NOT_INITIALIZED,
        );
    }

    /// Distributed-systems rule: every lot creation in a library serialises on
    /// Library.lot_count. A client that built its transaction from a stale count
    /// gets ConstraintSeeds and must re-read the library and rebuild.
    #[test]
    fn stale_lot_count_rejected_then_retry_succeeds() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let alex = funded(&mut w.svm);
        join(&mut w.svm, &w.library, &alex).unwrap();
        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        borrow(&mut w.svm, &alex, &w.library, &w.root_lot, 10).unwrap();
        let sams_loan = loan_pda(&member_pda(&w.library, &sam.pubkey()), 0);
        let alexs_loan = loan_pda(&member_pda(&w.library, &alex.pubkey()), 0);

        // Both clients read lot_count = 1 before either transaction lands.
        let stale = fetch::<Library>(&w.svm, &w.library).lot_count;
        let ix_sam = return_lot_ix(
            &sam.pubkey(),
            &w.library,
            &sams_loan,
            &w.root_lot,
            stale,
            30,
            PHOTO,
            "",
        );
        let ix_alex = return_lot_ix(
            &alex.pubkey(),
            &w.library,
            &alexs_loan,
            &w.root_lot,
            stale,
            30,
            PHOTO,
            "",
        );
        send(&mut w.svm, ix_sam, &sam).unwrap();
        assert_code(send(&mut w.svm, ix_alex, &alex), ANCHOR_CONSTRAINT_SEEDS);

        // Retry with a fresh read succeeds.
        return_lot(&mut w.svm, &alex, &w.library, &alexs_loan, 30, PHOTO).unwrap();
        assert_eq!(fetch::<Library>(&w.svm, &w.library).lot_count, 3);
    }

    /// Lot and loan addresses are predictable, so anyone can send lamports to
    /// them first. Anchor's `init` must still succeed (lamport griefing).
    #[test]
    fn pre_funded_pdas_do_not_block_borrow_or_return() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let member = member_pda(&w.library, &sam.pubkey());
        w.svm.airdrop(&loan_pda(&member, 0), 1_000_000).unwrap();
        w.svm.airdrop(&lot_pda(&w.library, 1), 1_000_000).unwrap();

        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 10).unwrap();
        return_lot(
            &mut w.svm,
            &sam,
            &w.library,
            &loan_pda(&member, 0),
            30,
            PHOTO,
        )
        .unwrap();
        assert_eq!(
            fetch::<Lot>(&w.svm, &lot_pda(&w.library, 1)).parent,
            Some(w.root_lot)
        );
    }

    #[test]
    fn borrowing_the_whole_lot_empties_it() {
        let mut w = world();
        let sam = w.sam.insecure_clone();
        let alex = funded(&mut w.svm);
        join(&mut w.svm, &w.library, &alex).unwrap();

        borrow(&mut w.svm, &sam, &w.library, &w.root_lot, 100).unwrap();
        assert_eq!(fetch::<Lot>(&w.svm, &w.root_lot).qty_available, 0);
        assert_err(
            borrow(&mut w.svm, &alex, &w.library, &w.root_lot, 1),
            SeedLibraryError::InsufficientSeed,
        );
    }

    #[test]
    fn every_instruction_within_compute_budget() {
        let mut svm = setup();
        let steward = funded(&mut svm);
        let library = library_pda(&steward.pubkey());
        let sam = funded(&mut svm);
        let member = member_pda(&library, &sam.pubkey());

        let measured = [
            (
                "init_library",
                init_library(&mut svm, &steward, "Allotment Seed Tin"),
            ),
            (
                "add_lot",
                add_lot(&mut svm, &steward, &library, "Borlotti bean", 100),
            ),
            ("join", join(&mut svm, &library, &sam)),
            (
                "borrow",
                borrow(&mut svm, &sam, &library, &lot_pda(&library, 0), 10),
            ),
            (
                "return_lot",
                return_lot(&mut svm, &sam, &library, &loan_pda(&member, 0), 30, PHOTO),
            ),
        ];
        for (name, result) in measured {
            let cu = compute_units(&result);
            assert!(result.is_ok(), "{name} failed");
            assert!(cu < CU_BUDGET, "{name} used {cu} CU, budget {CU_BUDGET}");
        }
    }
}
