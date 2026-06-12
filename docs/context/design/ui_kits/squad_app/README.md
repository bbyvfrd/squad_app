# SQUAD App — UI Kit

The in-app surfaces (Home + Games), built **entirely from the canonical `.sq-*` system** in `../../colors_and_type.css`. This kit is a faithful application of the design system, not a parallel one: every reusable component — cards, badges, buttons, the capacity bar, avatar stacks, skill tags, chips, sport chips + tints — is a system class. Only device chrome (phone frame, status bar, tab bar, headers, day rail, search) is kit-local, under the `.sqk-*` namespace in `kit.css`.

## Files
- `index.html` — mounts Home + Games side by side in a design canvas
- `kit.css` — screen chrome only (`.sqk-*`), builds on `../../colors_and_type.css`
- `phone.jsx` — device frame, status bar, tab bar, `MIcon`, `SportChip`, `Reveal`, sport map
- `screens-home.jsx` — Home: search, browse-by-sport, upcoming, explore tiles, games + venues near you
- `screens-games.jsx` — Games: marketing hero, day rail, filter rail, game cards

## What's canonical vs. kit-local

| Piece | Class |
|---|---|
| Card surface | `.sq-card` `.is-interactive` |
| Game / hosting / role badge | `.sq-badge .is-*` |
| Join / Waitlist button | `.sq-btn .sq-btn-primary / -outline .sq-btn-sm` |
| Roster capacity bar | `.sq-spots` |
| Going avatars | `.sq-avatars` / `.sq-av` |
| Skill level | `.sq-skill .lv-1…5` |
| Filter pill | `.sq-chip` |
| Sport glyph tile + tint | `.sq-sportchip` + `.sq-sport-*` |
| Bottom tab bar | `.sq-tabbar` / `.sq-tab` |
| Top bar + icon buttons | `.sq-topbar`, `.sq-iconbtn` |
| Phone frame, day rail, search, location pill… | `.sqk-*` (this kit) |

## Coverage
| Area | Status |
|---|---|
| Home feed (active) | ✅ |
| Games browse + cards | ✅ |
| Venue cards | ✅ (placeholder photos) |
| Empty states | ⛔ Not shown here (live in the source project) |
| Onboarding / auth | ⛔ Not in this kit |
| Map / venue detail | ⛔ Not in this kit |

All venue/game data is mocked from `PRODUCT.md`. Photography uses clearly-marked `<image-slot>` placeholders the author fills in.
