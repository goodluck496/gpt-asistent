import { Telegraf } from 'telegraf';
import { Commands } from './types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { BaseCommand } from './base.command';
import { SessionsService } from '../session/sessions.service';

export class LeaveCommand extends BaseCommand {
    order = 1;
    command = Commands.LEAVE;
    description = 'завершает текущую сессию с ботом';

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        private sessionService: SessionsService,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        super();
        super.registrationHandler();
    }

    async commandHandler(ctx) {
        ctx.reply('Приходи еще! =)');
        if (ctx.chat.type !== 'private') {
            try {
                await ctx.leaveChat();
            } catch (err) {
                console.log('Ошибка...', err);
            }
        }

        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            return;
        }

        void this.tgUserSessionRepo.update(session.id, { isActive: false });
    }
}
