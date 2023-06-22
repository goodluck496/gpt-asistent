import { Telegraf } from 'telegraf';
import { Commands } from './types';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';
import { BaseCommand } from './base.command';
import { SessionsService } from '../../session/sessions.service';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';

@Injectable()
export class LeaveCommand extends BaseCommand {
    order = 1;
    name = Commands.LEAVE;
    description = 'завершает текущую сессию с ботом';

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        private sessionService: SessionsService,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        super();
        super.registrationHandler();
    }

    async commandHandler(from, ctx) {
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
