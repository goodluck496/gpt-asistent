import { Inject, Injectable } from '@nestjs/common';
import {
    IVoiceApiService,
    IVoiceToTextService,
    VOICE_API_SERVICE_TOKEN,
    VOICE_TO_TEXT_SERVICE_TOKEN,
} from './voice.const-and-types';

@Injectable()
export class VoiceService {
    constructor(
        @Inject(VOICE_API_SERVICE_TOKEN) private service: IVoiceApiService,
        @Inject(VOICE_TO_TEXT_SERVICE_TOKEN) private vTtService: IVoiceToTextService,
    ) {}

    async textToSpeech(text: string): Promise<Buffer> {
        return this.service.textToSpeech(text);
    }

    async speechToText(filePath?: string): Promise<string> {
        return this.vTtService.speechToText(filePath);
    }
}
