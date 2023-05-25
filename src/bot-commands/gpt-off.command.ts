import { Context, Telegraf } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';

export class GptDisableCommand implements IBaseCommand {
    order = 4;
    command = Commands.GPT_OFF;
    description = 'выключает GPT помошника';

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.command(this.command, async (ctx: Context) => {
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
        });
    }
}
