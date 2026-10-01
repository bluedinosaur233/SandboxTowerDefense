import {mkdirSync,writeFileSync} from 'node:fs';
import {SOUND_FILES,SOUND_LIBRARY,UI_CUES} from '../src/ui/sound-library';
import {LICENSED_FILES} from '../src/ui/licensed-sounds';
mkdirSync('work/audio-stream',{recursive:true});
writeFileSync('work/audio-stream/sources.json',JSON.stringify({ui:[...new Set([...UI_CUES].flatMap(c=>SOUND_LIBRARY[c].files))],files:SOUND_FILES,licensed:LICENSED_FILES}));
