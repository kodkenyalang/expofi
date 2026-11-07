# Brand: ExpoFi

_Status: chosen 7 Nov 2026 (picked by the agent at the owner's request; re-theme any time with `/brand-design`)._

**Idea:** a seed packet and a paper ledger, not a crypto dashboard. Warm paper, soil-dark ink, one leaf green. The buyer is a volunteer with a tin of seed in a shed.

## Colour

Tokens live in `app/globals.css`. Use the tokens, never the hex values.

| Token         | Light     | Dark      | Use                          |
| ------------- | --------- | --------- | ---------------------------- |
| `background`  | `#fbf8f1` | `#171510` | Page: paper / soil           |
| `foreground`  | `#24201a` | `#f1ece0` | Text                         |
| `card`        | `#fffdf8` | `#211e17` | Lots, panels                 |
| `primary`     | `#2f5d3a` | `#9ad1a7` | The one action on a screen   |
| `muted`       | `#655c50` | `#aea493` | Secondary text (AA on paper) |
| `border`      | `#e4dccb` | `#3a352a` | Hairlines                    |
| `leaf`        | `#3f7d4e` | `#8cc79a` | Lineage, "grown" states      |
| `clay`        | `#a34e1a` | `#e39a63` | Generation labels, the gate  |
| `destructive` | `#a8321a` | `#f0795c` | Only a real failure          |

Rule: green means growing, clay means the rule is speaking, red is rare. A refused borrow is **clay, not red**: the system is working, and nobody did anything wrong.

## Type

- **Fraunces** for the wordmark, headings, and variety names: it has the feel of a seed packet.
- **Inter** for everything else.
- **Geist Mono** for addresses and fingerprints only. Quantities are plain tabular numbers.

## Voice

Plain and warm, like a note in the tin. Say "seed", "borrow", "return", "grown by". Avoid "transaction", "wallet signature", "on-chain" unless the reader needs it: the one place Solana is named on purpose is the refusal ("Refused by the Solana program"). No token or finance language, ever.

Never blame. "You have an open loan" and "Nothing was sent", not "Error" or "Invalid".

## Not this

No gradients, glow, grid backgrounds, or stat tiles. No dark-by-default crypto look: the default theme is light.
