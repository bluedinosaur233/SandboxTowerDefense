# Sound effects credits

All recordings are bundled locally; the game never contacts the authors' sites during play.
File-by-file authors, original filenames, licenses and SHA-256 hashes: [manifest.json](manifest.json).

| Pack | Author | License |
| --- | --- | --- |
| [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney Vleugels | CC0 1.0 |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney Vleugels | CC0 1.0 |
| [RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) | artisticdude | CC0 1.0 |
| [Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx) | JaggedStone | CC0 1.0 |
| [Cannon fire](https://opengameart.org/content/cannon-fire), [Cannon hit](https://opengameart.org/content/cannon-hit) | Thimras | CC0 1.0 |
| [8 Magic Attacks](https://opengameart.org/content/8-magic-attacks) | leohpaz | CC BY 4.0 |
| [Magic SFX Sample](https://opengameart.org/content/magic-sfx-sample) | ViRiX Dreamcore (David Mckee) | CC BY 3.0 |
| [Magic Shield](https://opengameart.org/content/magic-shield), [Magic Death](https://opengameart.org/content/magic-death) | spookymodem | CC BY 3.0 |

Some of the sounds in this project were created by ViRiX Dreamcore (David Mckee) www.soundcloud.com/virix

License texts: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
These licenses permit commercial use and redistribution; retain attribution for CC BY recordings.
No endorsement by the authors is implied.

Additional recordings downloaded 2026-09-29. Original downloads from that batch retain their original audio bytes; filenames are shortened.
Runtime playback applies peak normalization, automatic leading-silence skip, gain, stereo positioning, occasional pitch shifts and fade/truncation envelopes.


## Combat revision — 2026-09-30

New recordings replace the bright chime-like magic cues and delayed mortar attack:

| Pack | Author | License | Files used |
| --- | --- | --- | --- |
| [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | rubberduck | CC0 1.0 | energy-cast / impact / surge, flame-cast / impact / roar, blade-cut / enchanted, shield-block |
| [25 CC0 bang / firework SFX](https://opengameart.org/content/25-cc0-bang-firework-sfx) | rubberduck | CC0 1.0 | mortar-impact, siege-impact, shell-impact, missile-impact |
| [Ice and Electricity Magic](https://opengameart.org/content/ice-electricity-magic) | Iwan 'qubodup' Gabovitch, https://qubodup.net | CC BY 3.0 | electric-cast / crack, ice-crack / crush / wind, holy-breath |

These 19 WAV derivatives are converted to mono PCM, smoothed with a short FIR, trimmed to their useful onset, peak normalized and given a short fade-out. Electrical impact begins at the crack rather than the preceding charge. Exact source hashes, original filenames, edit offsets, durations and output hashes are in the manifest. Rebuild with `scripts/prepare-combat-audio.py` (numpy + soundfile) from the extracted archives:

- https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip
- https://opengameart.org/sites/default/files/25-CC0-bang-sfx.zip
- https://opengameart.org/sites/default/files/qubodupIceAndElectricitySpells.7z

Earlier recordings remain credited and bundled, but unused samples are not preloaded. Music is unchanged.

## Optional Pixabay / Mixkit pack — 2026-09-30

The local playable build now prefers 24 active edited clips from 20 source recordings for 46 combat cues (26 prepared clips including comparison versions). These are custom-license recordings, separate from this redistributable fallback collection. Sources and terms: [LICENSED-CREDITS.md](../LICENSED-CREDITS.md). Reproduction instructions: `docs/audio/README.md`.
