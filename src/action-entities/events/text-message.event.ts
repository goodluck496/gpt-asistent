import { Events } from './types';
import { message } from 'telegraf/filters';
import { Context, Telegraf } from 'telegraf';
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
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';
import { SendTextToGptScenario, SendVoiceFromTextScenario } from '../scenaries';

@Injectable()
export class TextMessageEvent implements IBaseTelegramActionEntity {
    name = Events.TEXT;
    type = TELEGRAM_ACTION_TYPES.EVENT;

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
        @Inject(SendVoiceFromTextScenario.name) private readonly sendVoiceFromTextScenario: SendVoiceFromTextScenario,
        @Inject(SendTextToGptScenario.name) private readonly sendGptScenario: SendTextToGptScenario,
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
Это сообщения является командой, но не было обработано. 
Команда '${ctx.message.text}' не зарегистрирована`);
                return;
            }

            const activeSession = await this.sessionService.getActiveSessionByChatId(ctx.message.chat.id);
            const gptOption = activeSession.options.find((el) => el.key === SessionOptionKeys.GPT_ENABLE);
            const textToVoice = activeSession.options.find((el) => el.key === SessionOptionKeys.VOICE_ENABLE);

            await ctx.sendChatAction('typing');
            if (gptOption && bool(gptOption.value)) {
                await ctx.reply('Жду ответа от GPT...');

                await this.sendGptScenario.send(ctx, activeSession);
            } else if (textToVoice) {
                await this.reply(ctx, bool(textToVoice.value));
            }
        });
    }

    async reply(ctx: Context<TextMessage>, voice: boolean): Promise<void> {
        if (!voice) {
            console.log('Эхо ответ');
            void ctx.replyWithHTML(`<code>${JSON.stringify(ctx.message, null, 4)}</code>`);
            return;
        }

        void this.sendVoiceFromTextScenario.send(ctx);
    }
}
