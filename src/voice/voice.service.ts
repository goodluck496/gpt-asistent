import { Inject, Injectable } from '@nestjs/common';
import {
    ITextToVoiceParams,
    ITextToVoiceService,
    IVoiceModel,
    IVoiceToTextService,
    TEXT_TO_VOICE_SERVICE_TOKEN,
    VOICE_TO_TEXT_SERVICE_TOKEN,
} from './voice.const-and-types';
import { SessionsService } from '../session/sessions.service';
import { SessionOptionKeys } from '../database/telegram-user-session-options.entity';

@Injectable()
export class VoiceService {
    constructor(
        @Inject(TEXT_TO_VOICE_SERVICE_TOKEN) private ttsService: ITextToVoiceService,
        @Inject(VOICE_TO_TEXT_SERVICE_TOKEN) private vttService: IVoiceToTextService,
        private session: SessionsService,
    ) {}

    getModels(): Promise<IVoiceModel[]> {
        return this.ttsService.getModels();
    }

    async textToSpeech(text: string, sessionId: number): Promise<Buffer> {
        const options = await this.session.getSessionOptions(sessionId);

        let { value: model } = options.find((op) => op.key === SessionOptionKeys.VOICE_SEX_MODEL);
        if (!model) {
            model = await this.getModels().then((data) => data[0].modelName);
        }
        const params: Partial<ITextToVoiceParams> = {
            model: model,
            speed: 1,
        };

        return this.ttsService.textToSpeech(text, params);
    }

    async speechToText(filePath?: string): Promise<string> {
        return this.vttService.speechToText(filePath);
    }
}
