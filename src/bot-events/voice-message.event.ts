import { Events, IBaseEvent } from './types';
import { Inject } from '@nestjs/common';
import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { OpenAiService } from '../openai.module';
import { SessionsService } from '../session/sessions.service';
import { VoiceService } from '../voice/voice.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../database/message.entity';
import { Repository } from 'typeorm';
import { message } from 'telegraf/filters';
import { FileSaveService } from '../file-save/file-save.service';
import { v4 as uuid } from 'uuid';
import { Update } from 'typegram/update';
import { ChatCompletionRequestMessage } from 'openai';

export class VoiceMessageEvent implements IBaseEvent {
    event = Events.VOICE;

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        public voiceService: VoiceService,
        public fileSaverService: FileSaveService,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
    ) {
        setTimeout(() => {
            this.registrationHandler();
            this.handlerActions();
        }, 1000);
    }

    registrationHandler(): void {
        this.bot.on(message(this.event), async (ctx) => {
            const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);

            const fileExtension = fileLink.pathname.split('.').pop();
            const filePath = await this.fileSaverService.saveByLink(fileLink.href, `${uuid()}_voice.${fileExtension}`);

            try {
                await ctx.reply('Подождите...');
                const session = await this.sessionService.getActiveSessionByChatId(ctx.message.from.id);
                if (!session) {
                    ctx.reply('Сначала начтине сессию командой /start');
                    return;
                }
                await ctx.sendChatAction('record_voice');
                const res = await this.voiceService.speechToText(filePath);
                await ctx.reply(`Вы сказали - "${res}"`);

                await this.sessionService.saveMessages(session.id, [
                    {
                        sessionId: session.id,
                        gptAnswer: false,
                        askByVoice: true,
                        text: res,
                    },
                ]);

                await ctx.reply('Спросить у GPT?', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'Да', callback_data: 'ask-to-gpt' },
                                { text: 'Что еще можно сделать?', callback_data: 'some-else' },
                            ],
                        ],
                        one_time_keyboard: true,
                    },
                });
            } catch (err) {
                ctx.reply(
                    JSON.stringify(
                        {
                            message: 'Ошибка распознования',
                            error: err,
                        },
                        null,
                        4,
                    ),
                );
            }

            console.log('voice', fileLink, filePath);
        });
    }

    handlerActions(): void {
        this.bot.action('ask-to-gpt', async (ctx) => {
            ctx.sendChatAction('typing');
            const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
            const messages = await this.sessionService.getMessagesForSession(
                session.id,
                { gptAnswer: false, askByVoice: true },
                { id: { direction: 'ASC' } },
            );
            if (!messages.length) {
                ctx.reply('Что-то пошло не так...');
                return;
            }
            console.log(
                'messages for send',
                messages.map((el) => `gpt-${el.gptAnswer}, ${el.text} \r\n`),
            );
            const messagesForSend: ChatCompletionRequestMessage[] = messages.map((el) => ({
                role: el.gptAnswer ? 'assistant' : 'user',
                content: el.text,
            }));
            const aiMessage = await this.openAIService.createCompletion(session.id, messagesForSend);
            void this.sessionService.saveMessages(session.id, [{ gptAnswer: true, askByVoice: true, text: aiMessage }]);
            void ctx.replyWithHTML(aiMessage);
        });
        this.bot.action('some-else', (ctx: NarrowedContext<Context, Update.CallbackQueryUpdate>) => {
            const messId = ctx.update.callback_query.message.message_id;
            void ctx.deleteMessage(messId);
            console.log('some-else', ctx);
        });
    }
}
