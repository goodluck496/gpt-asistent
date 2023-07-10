import { Injectable } from '@nestjs/common';
import { Context, Input, session } from 'telegraf';
//todo НЕ УДАЛЯТЬ, почему-то кривой экспорт в библиотеке
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextMessage } from 'typegram/message';
import { VoiceService } from '../../voice/voice.service';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';
import { SCENARIO } from './types';
import { SessionsService } from '../../session/sessions.service';

@Injectable()
export class SendVoiceFromTextScenario implements IBaseTelegramActionEntity {
    name = SCENARIO.TEXT_TO_VOICE;
    type = TELEGRAM_ACTION_TYPES.SCENARIO;

    constructor(private voiceService: VoiceService, private session: SessionsService) {
        this.registrationHandler();
    }

    registrationHandler() {
        void 0;
    }

    async send(ctx: Context<TextMessage>): Promise<void> {
        const activeSession = await this.session.getActiveSessionByChatId(ctx.message.from.id);
        await ctx.sendChatAction('record_voice');
        const text: string = ctx.message.text.replace(new RegExp('\n', 'g'), ' ');

        const chunkSize = 1000;
        const chunks = [];
        if (text.length > chunkSize) {
            const allWords = text.split(' ');
            let tempChunk = [];
            let iterator = 0;

            for (const word of allWords) {
                iterator++;
                if (tempChunk.join(' ').length < chunkSize) {
                    tempChunk.push(word + ' ');
                    if (tempChunk.join(' ').length > chunkSize) {
                        const deleteItem = tempChunk.pop();
                        chunks.push([...tempChunk]);
                        tempChunk = [deleteItem];
                    } else if (iterator === allWords.length) {
                        chunks.push([...tempChunk]);
                        tempChunk = [];
                    }
                }
            }
        } else {
            chunks.push(text);
        }

        const buffers = await Promise.all(
            chunks.map(async (chunkText) => {
                await ctx.sendChatAction('record_voice');
                const speech = await this.voiceService.textToSpeech(chunkText, activeSession.id);
                if (!speech) {
                    console.log('Не получилось преобразовать фразу в голос');
                    await ctx.reply('Не удалось перевести текст в речь...');
                    return;
                }
                return Input.fromBuffer(speech);
            }),
        );

        for (const buffer of buffers) {
            await ctx.replyWithVoice(buffer);
        }
    }
}
