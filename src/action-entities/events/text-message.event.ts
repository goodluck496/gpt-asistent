import { Events } from './types';
import { message } from 'telegraf/filters';
import { Context, Input, Telegraf } from 'telegraf';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { MessageEntity } from '../../database/message.entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAiService } from '../../openai.module';
//todo НЕ УДАЛЯТЬ, почему-то кривой экспорт в библиотеке
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextMessage } from 'typegram/message';
import { SessionsService } from '../../session/sessions.service';
import { SessionOptionKeys } from '../../database/telegram-user-session-options.entity';
import { bool } from '../../helpers';
import { VoiceService } from '../../voice/voice.service';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';

@Injectable()
export class TextMessageEvent implements IBaseTelegramActionEntity {
    name = Events.TEXT;
    type = TELEGRAM_ACTION_TYPES.EVENT;

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        public voiceService: VoiceService,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    ) {
        setTimeout(() => {
            // команды должны быть зареганы ботом раньше евентов, для этого у последних ставим таймаут
            this.registrationHandler();
        }, 1000);
    }

    registrationHandler(): void {
        this.bot.on(message(this.name), async (ctx: Context<TextMessage>) => {
            if (ctx.message.text.startsWith('/')) {
                console.log(`
Это сообщения является командой, но небыло обработано. 
Команда '${ctx.message.text}' не зарегистрирована`);
                return;
            }

            const activeSession = await this.sessionService.getActiveSessionByChatId(ctx.message.chat.id);
            const gptOption = activeSession.options.find((el) => el.key === SessionOptionKeys.GPT_ENABLE);
            const textToVoice = activeSession.options.find((el) => el.key === SessionOptionKeys.VOICE_ENABLE);

            await ctx.sendChatAction('typing');
            if (gptOption && bool(gptOption.value)) {
                await ctx.reply('Жду ответа от GPT...');
                await this.sendToGpt({ ctx, text: ctx.message.text, session: activeSession });
            } else if (textToVoice) {
                await this.reply(ctx, bool(textToVoice.value));
            }
        });
    }

    async sendToGpt({ ctx, text, session }: { ctx: Context; text: string; session: TelegramUserSessionEntity }): Promise<void> {
        const sessionMessages: MessageEntity[] = await this.messageRepo.find({ where: { sessionId: session.id } });
        const messageForSend: ChatCompletionRequestMessage[] = [];

        if (sessionMessages.length) {
            messageForSend.push(
                ...sessionMessages.reduce((acc: ChatCompletionRequestMessage[], curr) => {
                    acc.push({
                        role: curr.gptAnswer
                            ? ChatCompletionRequestMessageRoleEnum.Assistant
                            : ChatCompletionRequestMessageRoleEnum.User,
                        content: curr.text,
                    });
                    return acc;
                }, []),
                {
                    role: ChatCompletionRequestMessageRoleEnum.User,
                    content: text,
                },
            );
        } else {
            messageForSend.push({
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: text,
            });
        }

        const systemMsg = session.options.find((el) => el.key === SessionOptionKeys.GPT_SYSTEM_MSG);
        if (systemMsg && systemMsg.value) {
            messageForSend.push({ role: 'system', content: systemMsg.value });
        }
        const aiMessage = await this.openAIService.createCompletion(session.id, messageForSend);

        await this.messageRepo.save([
            { id: null, session, text, gptAnswer: false },
            {
                id: null,
                text: aiMessage,
                gptAnswer: true,
                session,
            },
        ]);

        const lengthStr = 2000;

        const messageChunkCount = Math.ceil(aiMessage.length / lengthStr);
        const chunks = [];
        let index = 0;

        while (chunks.length <= messageChunkCount) {
            chunks.push(aiMessage.substring(index, lengthStr));
            index += lengthStr;
        }

        void Promise.all(
            chunks
                .filter((el) => !!el)
                .map(
                    (el, i) =>
                        new Promise((res, rej) => {
                            setTimeout(async () => {
                                try {
                                    await ctx.replyWithHTML(el);
                                    res(el);
                                } catch (err) {
                                    console.log('ERROR', err);
                                    void ctx.reply('ОШИБКА...');
                                }
                            }, 100 * i);
                        }),
                ),
        );

        // await ctx.reply(aiMessage || 'Gpt не ответил');
    }

    async reply(ctx: Context<TextMessage>, voice: boolean): Promise<void> {
        if (!voice) {
            console.log('Эхо ответ');
            void ctx.replyWithHTML(`<code>${JSON.stringify(ctx.message, null, 4)}</code>`);
            return;
        }

        await ctx.sendChatAction('record_voice');
        const text: string = ctx.message.text;

        const chunkSize = 370;
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
        }

        await Promise.all(
            chunks.map(async (chunkText) => {
                await ctx.sendChatAction('record_voice');
                const speech = await this.voiceService.textToSpeech(chunkText);
                if (!speech) {
                    console.log('Не получилось преобразовать фразу в голос');
                    await ctx.reply('Не удалось перевести текст в речь...');
                    return;
                }

                void ctx.replyWithVoice(Input.fromBuffer(speech));
            }),
        );
    }
}
