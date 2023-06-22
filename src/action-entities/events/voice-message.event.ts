import { Events } from './types';
import { Inject, Injectable } from '@nestjs/common';
import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { OpenAiService } from '../../openai.module';
import { SessionsService } from '../../session/sessions.service';
import { VoiceService } from '../../voice/voice.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../../database/message.entity';
import { Repository } from 'typeorm';
import { message } from 'telegraf/filters';
import { FileSaveService } from '../../file-save/file-save.service';
import { v4 as uuid } from 'uuid';
import { Update } from 'typegram/update';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { ModuleRef } from '@nestjs/core';
import { SCENARIO } from '../scenaries/types';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';

@Injectable()
export class VoiceMessageEvent implements IBaseTelegramActionEntity {
    name = Events.VOICE;
    type = TELEGRAM_ACTION_TYPES.EVENT;

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        public voiceService: VoiceService,
        public fileSaverService: FileSaveService,
        private readonly moduleRef: ModuleRef,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
    ) {
        setTimeout(() => {
            this.registrationHandler();
            this.handlerActions();
        }, 1000);
    }

    registrationHandler(): void {
        this.bot.on(message(this.name), async (ctx) => {
            const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);

            const fileExtension = fileLink.pathname.split('.').pop();
            const filePath = await this.fileSaverService.saveByLink(fileLink.href, `${uuid()}_voice.${fileExtension}`);

            try {
                await ctx.reply('Подождите...');
                await ctx.sendChatAction('typing');
                const session = await this.sessionService.getActiveSessionByChatId(ctx.message.from.id);
                if (!session) {
                    ctx.reply('Сначала начтине сессию командой /start');
                    return;
                }
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
                                { text: 'Да', callback_data: SCENARIO.LAST_VOICE_TO_GPT },
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
        });
    }

    handlerActions(): void {
        this.bot.action('some-else', (ctx: NarrowedContext<Context, Update.CallbackQueryUpdate>) => {
            const messId = ctx.update.callback_query.message.message_id;
            void ctx.deleteMessage(messId);
            console.log('some-else', ctx);
        });
    }
}
