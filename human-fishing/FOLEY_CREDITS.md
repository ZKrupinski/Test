# Human Fishing — Foley sound licensing & audio direction

The game uses **29 bundled CC0 OGG Foley samples** (approximately 295 KB total)
and **39 distinct event cues**. The engine in `foley.js` layers real recorded
tactile samples into compact modern rewards without oscillators or digital beeps.
No copyrighted commercial music, character voices, or character likenesses are used.

## Provenance and licensing

- **Kenney Impact Sounds**, Creative Commons CC0 1.0:
  <https://kenney.nl/assets/impact-sounds>
  These are the 11 wood/soft/punch/plank/tap recordings redistributed in
  `GeorgeQLe/assets-sfx-combat` under `assets/kenney/impact-sounds/Audio`.
- **Kenney RPG Audio**, Creative Commons CC0 1.0:
  <https://kenney.nl/assets/rpg-audio>
  The 14 physical fabric, book, coin, leather and creak recordings are mirrored
  under `GeorgeQLe/assets-sfx-combat/assets/kenney/rpg-audio/Audio`.
- **Rubberduck, 40 CC0 water splash & slime SFX**, CC0:
  <https://opengameart.org/content/40-cc0-water-splash-slime-sfx>.
  The two `fishing-splash.ogg` and `fishing-plop.ogg` OGG edits are carried by
  `Julian-adv/OpenMMO/client/public/sounds` and described in its
  `doc/assets/sfx.md` as CC0.
 - **Kenney Interface Sounds**, Creative Commons CC0 1.0:
  <https://kenney.nl/assets/interface-sounds>.
  The two edited `fishing-reel.ogg` and `fishing-snap.ogg` OGG files are
  sourced from the same OpenMMO sound directory, which documents their
  `click_004` and `pluck_001` CC0 origin.

Specific source URL for every actual file is embedded in the `SRC` map in
`foley.js`. `scripts/install_foley_assets.py` downloads the approved source
files, validates that they are OGG, and stores them under `assets/foley`.
`.github/workflows/human-fishing-foley.yml` handles safe bundling once on push.
The game serves its own local copies first, and falls back to the public source
URL only if a local file is unavailable.

CC0: <https://creativecommons.org/publicdomain/zero/1.0/>

## Interaction-to-sound design

- Cast and rod movements: close fabric swish, wood creaks and reel ratchet.
- Water entry, brush and bite: real water plops/splashes with restrained soft
  contact sounds. A brush is quieter than a successful bite.
- Hook pull: quiet spaced reel sound as the fish rises; no sustained UI beeps.
- Octo Fever: heavy liquid rush + tactile impact; short sharp impact synced to
  the 24–90 ms fish-group snap; tiny splashes as the suction continues; three
  physically distinct pumping cues while pulling the line.
- Swallow and reward: liquid plop, dull impact, natural coins spilling.
  Ordinary fish catches use a soft impact and two restrained rising coin
  accents; the former loud brass sample was removed completely. OCTO FEVER
  uses its own DIFFERENT sampled plucked sound for EACH fish card in a steady
  0.52-second left-to-right pachinko-style sequence, plus a quiet finale.
- Escape, human counterattack, groggy: fast splash, dense hand/punch/wood
  strikes, not lasers or synthesized warning tones.
- Menus, equipment, shop, aquarium and catalog: book pages, leather and gentle
  wood taps with intentionally separate purchase/upgrade/equip and placement
  feedback. Repeated inputs are rate-limited to prevent a wall of noise.

The master effects gain defaults to 72% and can be adjusted through
`HumanFishingFoley.setVolume(0..1)` in the console. Browser audio is unlocked
on the first permitted pointer/key gesture. Playback uses decoded buffers with
small natural playback-rate variation, never an oscillator.
