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
        return this.vttService.speechToText(filePath).then((res) => this.postProcessText(res));
    }

    postProcessText(text: string): string {
        const punctuationMap: Record<string, string> = {
            'запятая': ', ',
            'двоеточие': ': ',
            'точка': '. ',
            'точка с запятой': '; ',
            'кавычка|кавычки': "'",
            'апостроф': '`',
            'двойная кавычка': '"',
            'правая скобка': ') ',
            'левая скобка': ' (',
            'знак минус': ' - ',
            'знак плюс': ' + ',
            'знак равно': ' = ',
            'знак звездочка': ' * ',
            'знак разделить': ' / ',
            'знак собачка': '@',
            'восклицательный знак|знак восклицания': '! ',
            'знак процент': '% ',
            'знак вопроса|вопросительный знак': '? ',
            'амперсанд': '&',
            'правый слэш': ' / ',
            'левый слэш': ' \\ ',
            'вертикальный слэш': ' | ',
        };

        const digitMap: Record<string, string> = {
            'ноль': '0',
            'один|адин': '1',
            'два': '2',
            'три': '3',
            'четыре': '4',
            'пять': '5',
            'шесть': '6',
            'семь': '7',
            'восемь': '8',
            'девять': '9',
            'десять': '10',
        };
        Object.keys({ ...punctuationMap, ...digitMap }).forEach((el) => {
            let regexp = new RegExp(`( ${el} )+`, 'gi');
            let foundReplaceEl = punctuationMap[el];

            if (!foundReplaceEl) {
                regexp = new RegExp(`(${el})+`, 'gi');
                foundReplaceEl = digitMap[el];
            }

            text = text.replace(regexp, foundReplaceEl);
        });

        return text;
    }
}
