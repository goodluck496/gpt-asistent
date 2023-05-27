import { Events, IBaseEvent } from './types';
import { message } from 'telegraf/filters';
import { Context, Input, Telegraf } from 'telegraf';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { MessageEntity } from '../database/message.entity';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { OpenAiService } from '../openai.module';
import axios, { AxiosRequestConfig } from 'axios';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextMessage } from 'typegram/message';
import * as config from 'config';

const VOICE_RSS_TOKEN: string = config.get('VOICE_RSS_TOKEN');

export class TextMessageEvent implements IBaseEvent {
    event: Events.TEXT;

    constructor(
        @Inject('TELEGRAM_BOT') private readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
        @Inject(OpenAiService) private openAIService: OpenAiService,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.on(message('text'), async (ctx: Context<TextMessage>) => {
            if (ctx.message.text.startsWith('/')) {
                console.log(`
Это сообщения является командой, но небыло обработано. 
Команда '${ctx.message.text}' не зарегистрирована`);
                return;
            }
            ctx.sendChatAction('typing');
            const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
            if (!user) {
                const errMsg = `Не найшел юзера с ID - ${ctx.from.id}`;
                console.log(errMsg);
                ctx.reply(errMsg);
                return;
            }
            const session = await this.tgUserSessionRepo.findOneBy({ user, isActive: true });
            if (!session) {
                ctx.reply('Для начала нужно ввести команду /start');
                return;
            }

            if (session.gptEnable) {
                await this.sendToGpt({ ctx, text: ctx.message.text, session });
            } else {
                await this.reply(ctx);
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

    async reply(ctx: Context<TextMessage>): Promise<void> {
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
