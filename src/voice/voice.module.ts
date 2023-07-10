import { Module } from '@nestjs/common';
import { TEXT_TO_VOICE_SERVICE_TOKEN, VOICE_TO_TEXT_SERVICE_TOKEN } from './voice.const-and-types';
import { VoiceService } from './voice.service';
import { VoskVoiceToTextService } from './voice-api-services/vosk.voice-to-text.service';
import { PiperTextToVoiceService } from './voice-api-services/piper.text-to-voice.service';

const providers = [
    {
        provide: TEXT_TO_VOICE_SERVICE_TOKEN,
        // useClass: VoiceRssService,
        useClass: PiperTextToVoiceService,
    },
    {
        provide: VOICE_TO_TEXT_SERVICE_TOKEN,
        useClass: VoskVoiceToTextService,
    },
    VoiceService,
];

@Module({
    providers: [...providers],
    exports: [...providers],
})
export class VoiceModule {}
