import { Events, IBaseEvent } from './types';
import { message } from 'telegraf/filters';
import { Context, Input, Telegraf } from 'telegraf';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { MessageEntity } from '../database/message.entity';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAiService } from '../openai.module';
import axios, { AxiosRequestConfig } from 'axios';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextMessage } from 'typegram/message';
import * as config from 'config';
import { SessionsService } from '../session/sessions.service';
import { SessionOptionKeys } from '../database/telegram-user-session-options.entity';
import { bool } from '../helpers';

const VOICE_RSS_TOKEN: string = config.get('VOICE_RSS_TOKEN');

export class TextMessageEvent implements IBaseEvent {
    event: Events.TEXT;

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    ) {
        setTimeout(() => {
            // команды должны быть зареганы ботом раньше евентов, для этого у последних ставим таймаут
            this.registrationHandler();
        }, 1000);
    }

    registrationHandler(): void {
        this.bot.on(message('text'), async (ctx: Context<TextMessage>) => {
            if (ctx.message.text.startsWith('/')) {
                console.log(`
Это сообщения является командой, но небыло обработано. 
Команда '${ctx.message.text}' не зарегистрирована`);
                return;
            }
            ctx.sendChatAction('typing');

            const activeSession = await this.sessionService.getActiveSessionByChatId(ctx.message.chat.id);
            const gptOption = activeSession.options.find((el) => el.key === SessionOptionKeys.GPT_ENABLE);
            const textToVoice = activeSession.options.find((el) => el.key === SessionOptionKeys.VOICE_ENABLE);

            if (gptOption && bool(gptOption.value)) {
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

        // await ctx.reply(JSON.stringify(messageForSend, null, 4));

        const systemMsg = session.options.find((el) => el.key === SessionOptionKeys.GPT_SYSTEM_MSG);
        if (systemMsg && systemMsg.value) {
            messageForSend.push({ role: 'system', content: systemMsg.value });
        }
        const aiMessage = await this.openAIService.createCompletion(messageForSend);
        await this.messageRepo.save([
            { id: null, session, text, gptAnswer: false },
            {
                id: null,
                text: aiMessage,
                gptAnswer: true,
                session,
            },
        ]);

        await ctx.reply(aiMessage || 'Gpt не ответил');
    }

    async reply(ctx: Context<TextMessage>, voice: boolean): Promise<void> {
        const response = await this.textToSpeech(ctx.message.text);
        if (!response) {
            console.log('Не получилось преобразовать фразу в голос');
            return;
        }
        // const pathOfFile = path.resolve(__dirname, 'voice.mp3');
        // fs.writeFileSync(pathOfFile, Buffer.alloc(response.length, response));
        //
        // // ctx.reply(Buffer.alloc(response).toString());
        // await ctx.replyWithVoice(Input.fromReadableStream(fs.createReadStream(pathOfFile), 'FILENAME1111'));

        ctx.replyWithVoice(Input.fromBuffer(response));
        //
        // await ctx.reply(JSON.stringify(response, null, 4));

        // ctx.replyWithAudio();
        // await ctx.reply(JSON.stringify(ctx.message, null, 4));
    }

    async textToSpeech(text: string): Promise<Buffer> {
        const encodedParams = new URLSearchParams();
        encodedParams.set('key', VOICE_RSS_TOKEN);
        encodedParams.set('hl', 'ru-ru');
        encodedParams.set('r', '0');
        encodedParams.set('c', 'MP3');
        // encodedParams.set('ssml', 'true');
        encodedParams.set('f', '16khz_16bit_stereo');
        encodedParams.set('src', text);

        const options: AxiosRequestConfig = {
            method: 'GET',
            url: 'http://api.voicerss.org',
            responseType: 'arraybuffer',
            params: encodedParams,
        };

        try {
            const response = await axios.request(options);
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            console.error('error', error);
            return null;
        }
    }
}