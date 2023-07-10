import { Inject, Injectable } from '@nestjs/common';
import {
    IVoiceApiService,
    IVoiceToTextService,
    TEXT_TO_VOICE_SERVICE_TOKEN,
    VOICE_TO_TEXT_SERVICE_TOKEN,
} from './voice.const-and-types';

@Injectable()
export class VoiceService {
    constructor(
        @Inject(TEXT_TO_VOICE_SERVICE_TOKEN) private ttsService: IVoiceApiService,
        @Inject(VOICE_TO_TEXT_SERVICE_TOKEN) private vttService: IVoiceToTextService,
    ) {}

    async textToSpeech(text: string): Promise<Buffer> {
        return this.ttsService.textToSpeech(text);
    }

    async speechToText(filePath?: string): Promise<string> {
        return this.vttService.speechToText(filePath);
    }
}
