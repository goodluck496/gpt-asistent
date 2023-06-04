import { Inject, Injectable } from '@nestjs/common';
import { IVoiceApiService, VOICE_API_SERVICE_TOKEN } from './voice.const-and-types';

@Injectable()
export class VoiceService {
    constructor(@Inject(VOICE_API_SERVICE_TOKEN) private service: IVoiceApiService) {}

    async textToSpeech(text: string): Promise<Buffer> {
        return this.service.textToSpeech(text);
    }

    async speechToText(buffer: Buffer): Promise<string> {
        return this.service.speechToText(buffer);
    }
}
