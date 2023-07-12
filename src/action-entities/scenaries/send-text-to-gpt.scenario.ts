import { Inject, Injectable } from '@nestjs/common';
import { SCENARIO } from './types';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { Telegraf } from 'telegraf';
import { OpenAiService } from '../../openai.module';
import { SessionsService } from '../../session/sessions.service';
import { MessageEntity } from '../../database/message.entity';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { SessionOptionKeys } from '../../database/telegram-user-session-options.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';

@Injectable()
export class SendTextToGptScenario implements IBaseTelegramActionEntity {
    name = SCENARIO.TEXT_QUESTION_TO_GPT;
    type = TELEGRAM_ACTION_TYPES.SCENARIO;

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) private bot: Telegraf,
        @Inject(OpenAiService) public openAIService: OpenAiService,
        public sessionService: SessionsService,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    ) {
        this.registrationHandler();
    }

    registrationHandler() {
        // this.bot.action(this.name, (ctx) => {});
    }

    async send(ctx, session: TelegramUserSessionEntity): Promise<void> {
        const sessionMessages: MessageEntity[] = await this.sessionService.getMessagesForSession(session.id);
        const messageForSend: ChatCompletionRequestMessage[] = [];
        const text = ctx.message.text;

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

        void this.sendByChunks(ctx, aiMessage).catch((err) => {
            ctx.reply(JSON.stringify(err, null, 4));
        });
    }

    async sendByChunks(ctx, message: string): Promise<void> {
        const lengthStr = 2000;

        const messageChunkCount = Math.ceil(message.length / lengthStr);
        const chunks = [];
        let index = 0;

        while (chunks.length <= messageChunkCount) {
            chunks.push(message.substring(index, lengthStr));
            index += lengthStr;
        }

        let indexForSend = 1;
        for (const chunk of chunks.filter((el) => !!el)) {
            await new Promise((res, rej) => {
                setTimeout(async () => {
                    try {
                        await ctx.reply(chunk);
                        res(chunk);
                    } catch (err) {
                        console.log('ERROR', err);
                        void ctx.reply('ОШИБКА...');
                        rej(err);
                    }
                }, 100 * indexForSend++);
            });
        }
    }
}
