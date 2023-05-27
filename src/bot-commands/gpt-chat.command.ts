import { Telegraf } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { getCommandArguments } from './helpers';

export class GptChatCommand implements IBaseCommand {
    order = 3;
    command = Commands.GPT_CHAT;
    defaultArg = 'enable';
    description = 'включает и отключает GPT помошника с помощью аргументов enable и disable';

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.command(this.command, async (ctx) => {
            const commandArguments = getCommandArguments(ctx.message.text);

            if (!commandArguments.length) {
                void this.enableGpt(ctx);
            }
            if (commandArguments[0] === 'enable') {
                void this.enableGpt(ctx);
            }
            if (commandArguments[0] === 'disable') {
                void this.disableGpt(ctx);
            }
        });
    }

    async enableGpt(ctx): Promise<void> {
        ctx.reply('Сейчас будем спрашивать у GPT');

        const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
        if (!user) {
            return;
        }
        const sessions = await this.tgUserSessionRepo.findBy({ user, isActive: true });
        if (!sessions.length) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }
        sessions.forEach((session) => {
            this.tgUserSessionRepo.update(session.id, { gptEnable: true });
        });
    }

    async disableGpt(ctx): Promise<void> {
        ctx.reply('GPT отключен');

        const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
        if (!user) {
            return;
        }
        const sessions = await this.tgUserSessionRepo.findBy({ user, isActive: true });
        if (!sessions.length) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }
        sessions.forEach((session) => {
            this.tgUserSessionRepo.update(session.id, { gptEnable: false });
        });
    }
}
