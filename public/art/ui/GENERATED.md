# Additional construction icons

Generated on 2026-09-29 with the user's configured XEM Image API, model gpt-image-2.5. Cropped from a 4 × 4 isometric fantasy asset sheet into 200 × 200 transparent PNGs. No third-party reference image was supplied.

Added: cannon, frost, tesla, bombard (mortar), shrapnel (magic missile silo), palisade, spikes, road, dig, raise, bridge, lower. Existing archer, mage, barracks and wall assets are preserved.

The generation prompt and original sheet are in the local work/ui-icons-expansion.txt and outputs/ui-icons-expansion.png. These working files are excluded from Git; runtime assets are included here.

## Grom boss banner

Frame and bright ivory-gold Chinese title generated with XEM / gpt-image-2.5. Sources and prompts: `docs/art/boss-hud/`. `scripts/prepare-boss-art.py` removes the crown, trims the frame to 1200 × 282, and crops the title using opaque glyph bounds. Runtime assets: `boss/grom-frame.webp` and `boss/grom-title-readable.webp`.

## Building actions

Six fantasy action icons (upgrade, repair, details, rotate left/right, dismantle) generated with XEM / gpt-image-2.5. Source and prompt: `docs/art/context-actions.png` and `docs/art/context-actions-prompt.txt`. Reproducible extraction: `scripts/prepare-action-art.py`; transparent runtime WebP files are in `actions/`.
