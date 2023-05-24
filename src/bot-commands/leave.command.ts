import { Context, Telegraf } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';

export class LeaveCommand implements IBaseCommand {
    command = Commands.LEAVE;

    constructor(
        @Inject('TELEGRAM_BOT') private readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.command(this.command, async (ctx: Context) => {
            ctx.reply('Приходи еще! =)');
            if (ctx.chat.type !== 'private') {
                try {
                    await ctx.leaveChat();
                } catch (err) {
                    console.log('Ошибка...', err);
                }
            }

            const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
            if (!user) {
                return;
            }
            const sessions = await this.tgUserSessionRepo.find({
                relations: {
                    user: true,
                },
                where: {
                    isActive: true,
                },
            });

            sessions.forEach(async (session) => {
                void this.tgUserSessionRepo.update(session.id, { isActive: false });
            });
        });
    }
}
