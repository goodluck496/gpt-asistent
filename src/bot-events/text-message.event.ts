import { Events, IBaseEvent } from './types';
import { TelegramBotService } from '../telegram-bot.module';
import { message } from 'telegraf/filters';
import { Context } from 'telegraf';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai/api';
import { MessageEntity } from '../database/message.entity';

export class TextMessageEvent implements IBaseEvent {
    event: Events.TEXT;
    service: TelegramBotService;

    handle(): this {
        this.service.bot.on(message('text'), async (ctx) => {
            if (ctx.message.text.startsWith('/')) {
                console.log(`
Это сообщения является командой, но небыло обработано. 
Команда '${ctx.message.text}' не зарегистрирована`);
                return;
            }
            ctx.sendChatAction('typing');
            const user = await this.service.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
            if (!user) {
                console.log(`Не найшел юзера с ID - ${ctx.from.id}`);
                return;
            }
            const session = await this.service.tgUserSessionRepo.findOneBy({ user, isActive: true });
            if (!session) {
                ctx.reply('Для начала нужно ввести команду /start');
                return;
            }

            if (session.gptEnable) {
                await this.sendToGpt({ ctx, text: ctx.message.text, session });
            } else {
                await this.reply(ctx);
            }
            // console.log('ctx.state', ctx);
        });

        return this;
    }

    async sendToGpt({ ctx, text, session }: { ctx: Context; text: string; session: TelegramUserSessionEntity }): Promise<void> {
        const sessionMessages: MessageEntity[] = await this.service.messageRepo.findBy({ session });
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

        const aiMessage = await this.service.openAiService.createCompletion(messageForSend);
        await this.service.messageRepo.save({
            text: aiMessage,
            gptAnswer: true,
            session,
        });

        await ctx.reply(aiMessage || 'Gpt не ответил');
    }

    async reply(ctx: Context): Promise<void> {
        await ctx.reply(JSON.stringify(ctx.message, null, 4));
    }

    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
