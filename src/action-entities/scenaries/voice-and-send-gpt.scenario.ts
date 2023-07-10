import { SessionsService } from '../../session/sessions.service';
import { ChatCompletionRequestMessage } from 'openai';
import { Telegraf } from 'telegraf';
import { Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from '../../openai.module';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../../database/message.entity';
import { Repository } from 'typeorm';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { SCENARIO } from './types';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';

@Injectable()
export class VoiceAndSendGptScenario implements IBaseTelegramActionEntity {
    name = SCENARIO.LAST_VOICE_TO_GPT;
    type = TELEGRAM_ACTION_TYPES.SCENARIO;

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
    ) {
        this.registrationHandler();
    }

    registrationHandler(): void {
        this.bot.action(this.name, async (ctx) => {
            ctx.sendChatAction('typing');
            const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
            const messages = await this.sessionService.getMessagesForSession(
                session.id,
                { askByVoice: true },
                { id: { direction: 'ASC' } },
            );
            if (!messages.length) {
                ctx.reply('Что-то пошло не так...');
                return;
            }

            const messagesForSend: ChatCompletionRequestMessage[] = messages.map((el) => ({
                role: el.gptAnswer ? 'assistant' : 'user',
                content: el.text,
            }));
            try {
                await ctx.sendChatAction('typing');
                const aiMessage = await this.openAIService.createCompletion(session.id, messagesForSend);
                void this.sessionService.saveMessages(session.id, [
                    { sessionId: session.id, gptAnswer: true, askByVoice: true, text: aiMessage },
                ]);
                await ctx.sendChatAction('typing');
                void ctx.replyWithHTML(aiMessage);
            } catch (err) {
                ctx.reply(JSON.stringify(err, null, 4));
            }
        });
    }
}
