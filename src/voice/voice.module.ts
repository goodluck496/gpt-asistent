import { Module } from '@nestjs/common';
import { VOICE_API_SERVICE_TOKEN, VOICE_TO_TEXT_SERVICE_TOKEN } from './voice.const-and-types';
import { VoiceRssService } from './voice-api-services/voice-rss.service';
import { VoiceService } from './voice.service';
import { VoiceLocalService } from './voice-api-services/voice-local.service';

const providers = [
    {
        provide: VOICE_API_SERVICE_TOKEN,
        useClass: VoiceRssService,
    },
    {
        provide: VOICE_TO_TEXT_SERVICE_TOKEN,
        useClass: VoiceLocalService,
    },
    VoiceService,
];

@Module({
    providers: [...providers],
    exports: [...providers],
})
export class VoiceModule {}
