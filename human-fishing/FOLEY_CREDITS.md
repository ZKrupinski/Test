# Human Fishing — Foley sound licensing & audio direction

The game uses **29 bundled CC0 OGG Foley samples** and **four entirely
original, offline-composed OGG item-acquisition jingles** (~57 KB combined).
The engine in `foley.js` provides **40 event-specific cues**. Normal/repeated
fish catches, first-time species discoveries, individual OCTO FEVER prizes and
the end of a Fever streak each have a distinct sound. Gameplay plays prerendered
buffers, not real-time oscillators. No copyrighted game recordings, recognizable
melodies or commercial character likenesses are used.

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

Every externally sourced CC0 Foley file has its verified URL embedded in
the `SRC` map in `foley.js`. `scripts/install_foley_assets.py` bundles those
recordings, while `scripts/render_reward_stingers.py` creates the following
**new compositions specifically for this game** from a glass-bell-style,
inharmonic, struck tone with a short musical ascent and resolving chord:

- `chest_prize.ogg`: standard fish capture (1.85s, clear rising chime)
- `chest_prize_new.ogg`: new species discovery (2.05s, richer flourish)
- `fever_prize_tick.ogg`: 0.44s per-fish sparkle, one every 0.52s
- `fever_prize_finish.ogg`: 1.25s gentle end-of-streak chord

These originals are **not sampled from or arranged after any copyrighted game
fanfare**; only the general emotion of discovering treasure informs the design.
The GitHub audio bundling workflow encodes them with FFmpeg/libvorbis and commits
the finished assets for low-latency local playback.

CC0: <https://creativecommons.org/publicdomain/zero/1.0/>

## Interaction-to-sound design

- Cast and rod movements: close fabric swish, wood creaks and reel ratchet.
- Water entry, brush and bite: real water plops/splashes with restrained soft
  contact sounds. A brush is quieter than a successful bite.
- Hook pull: quiet spaced reel sound as the fish rises; no sustained UI beeps.
- Octo Fever: heavy liquid rush + tactile impact; short sharp impact synced to
  the 24–90 ms fish-group snap; tiny splashes as the suction continues; three
  physically distinct pumping cues while pulling the line.
- Swallow and reward: close liquid plop and physical contact on the hook
  path, then a much clearer **five-note rising bell motif plus resolving chord**
  when the fish is credited. New species have a richer six-note phrase with
  sparkle. The Fever card uses its own separate audible bell glint on each
  0.52s card arrival, followed by an original ending chord. Original brass
  and barely audible low-gain coin-only rewards have been retired.
- Escape, human counterattack, groggy: fast splash, dense hand/punch/wood
  strikes, not lasers or synthesized warning tones.
- Menus, equipment, shop, aquarium and catalog: book pages, leather and gentle
  wood taps with intentionally separate purchase/upgrade/equip and placement
  feedback. Repeated inputs are rate-limited to prevent a wall of noise.

The master effects gain defaults to 72% and can be adjusted through
`HumanFishingFoley.setVolume(0..1)` in the console. Browser audio is unlocked
on the first permitted pointer/key gesture. Playback uses decoded buffers with
small natural playback-rate variation, never an oscillator.
