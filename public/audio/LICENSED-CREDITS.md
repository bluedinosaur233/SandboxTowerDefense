# Local licensed combat sound pack — 2026-09-30

Previous bundled effects came from OpenGameArt and Kenney; see [sfx/CREDITS.md](sfx/CREDITS.md). The optional local pack replaces hero bow/contact, hero abilities, elemental magic, branch attacks, sword contacts and explosions with edited Pixabay and Mixkit recordings.

These recordings use the sites’ custom licenses, **not CC0**. Free game use and editing are permitted. Mixkit forbids redistribution as stock or with source files; Pixabay forbids standalone distribution. Originals and derivatives stay outside the Git source repository. Deploy the playable game build; do not publish this directory as an audio asset pack. See [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) and [Pixabay Content License](https://pixabay.com/service/license-summary/).

| Recording | Creator | License |
| --- | --- | --- |
| [Icicles spell whoosh](https://mixkit.co/free-sound-effects/download/881/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Thin icicles spell](https://mixkit.co/free-sound-effects/download/882/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Fire spell with explosion](https://mixkit.co/free-sound-effects/download/1338/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Wind magic whoosh](https://mixkit.co/free-sound-effects/download/2610/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Short explosion](https://mixkit.co/free-sound-effects/download/1694/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Quick saber cut](https://mixkit.co/free-sound-effects/download/2158/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Sword strikes armor](https://mixkit.co/free-sound-effects/download/2765/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Electricity static power up](https://mixkit.co/free-sound-effects/download/2600/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Quick magic sword slice](https://mixkit.co/free-sound-effects/download/2793/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Sword cutting flesh](https://mixkit.co/free-sound-effects/download/2788/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Shot light energy flowing](https://mixkit.co/free-sound-effects/download/2589/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Arrow whoosh](https://mixkit.co/free-sound-effects/download/1491/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Bomb drop impact](https://mixkit.co/free-sound-effects/download/2804/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Healing water spell with deep hit](https://mixkit.co/free-sound-effects/download/877/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Heavy electric shockwave impact](https://mixkit.co/free-sound-effects/download/2599/?context=item+grid) | Mixkit | [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree) |
| [Arrow Body Impact](https://pixabay.com/sound-effects/film-special-effects-arrow-body-impact-146419/) | DennisH18 | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| [Bow Release (Bow and Arrow) 4](https://pixabay.com/sound-effects/film-special-effects-bow-release-bow-and-arrow-4-101936/) | Ali_6868 (Freesound), uploaded by freesound_community | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| [Elemental Magic Spell Impact Outgoing](https://pixabay.com/sound-effects/film-special-effects-elemental-magic-spell-impact-outgoing-228342/) | RescopicSound | [Pixabay Content License](https://pixabay.com/service/license-summary/) |

| [Arrow Release and Hit](https://pixabay.com/sound-effects/film-special-effects-arrow-release-and-hit-88839/) | calvarychurchatlanta (Freesound), uploaded by freesound_community | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| [Arrow Hit](https://pixabay.com/sound-effects/film-special-effects-arrow-hit-307490/) | Creator name not displayed on the source page at download | [Pixabay Content License](https://pixabay.com/service/license-summary/) |

Edits: mono downmix, short event-specific cuts, smooth high-frequency roll-off, resampling / pitch adjustments, peak normalization and attack/tail fades. Arrow contact starts at the body impact; mortar impact excludes the falling whistle. Exact recipes and source hashes: `docs/audio/licensed-pack.json`. Local output hashes: `audio/licensed/pack.json`. No endorsement by the creators is implied.

Hero bow revision: a separate real bow-release segment is mixed with a quiet wind layer. The hero contact uses Arrow Hit with a softened frequency balance, lower event gain and a small air layer. Original versions remain available for comparison; recipes include exact layer weights and offsets.

Later hero revision: the release returns to the bundled original `swing-2.wav`. Hero contact is a separate, short segment of Arrow Release and Hit (0.496–0.686 s), without an added air layer, at lower event gain. Earlier replacements remain as comparison assets only where no other unit uses them.

### 2026-09-30 · 魔力导弹重混

`arcane-missile-launch.wav` 由 Mixkit 2589 “Shot light energy flowing” 与 2610 “Wind magic whoosh” 分层、滤波、剪辑组成；`arcane-missile-hit.wav` 由 Pixabay 228342 元素法术与 Mixkit 2599 电击冲击组成。来源、作者、许可链接和原文件校验值沿用本文件及 `docs/audio/licensed-pack.json` 的对应条目。重混没有加入铃铛音色；本地许可包继续作为成品游戏的一部分使用。

导弹与雷电系列的事件增益提高到 0.31–0.38，继续经过现有响度校准和峰值限制。英雄普通箭矢的发射素材保持原版。


### 2026-09-30 · 箭塔发射音替换

新增 Mixkit [Arrow shot through air](https://mixkit.co/free-sound-effects/arrow/)（素材 2771，[Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree)）。`tower-arrow-release.wav` 截取原素材 0.095–0.385 秒，移除前奏与空白尾部，100 Hz 高通、8.5 kHz 低通，单声道 32 kHz，峰值归一化及短淡入淡出。普通箭塔与游侠连弩分支分别以 0.46 / 0.40 事件增益播放；英雄发射不使用这条采样。


### 2026-09-30 · 雷罚尖塔

`judgment-strike.wav` 使用本表 Mixkit 2599 “Heavy electric shockwave impact” 的 3.81 秒起始段，叠加 Mixkit 2600 “Electricity static power up” 的放电段，经过剪辑、滤波、轻微调速与淡入淡出。原文件 SHA-256、逐层参数见 `docs/audio/licensed-pack.json`。增益为 0.58，继续使用游戏的响度校准与峰值限制。

## Boss entrance and war cries — 2026-10-01

| Source | Author | License | Runtime clips |
| --- | --- | --- | --- |
| [Giant monster roar](https://mixkit.co/free-sound-effects/monster/) | Mixkit | Mixkit Sound Effects Free License | `grom-warcry.wav`, `grom-rage.wav` |

The source was downloaded from Mixkit item 1972. Two local clips trim the roar to a short attack, add a tiny fade, and normalize it for the Boss entrance and rage events. The source download remains in the ignored local audio workspace; the clips are only used as part of the game build.
