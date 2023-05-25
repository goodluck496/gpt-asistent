import { Context, Telegraf } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { TelegramUserEntity } from 'src/database/telegram-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { Inject } from '@nestjs/common';

export class StartCommand implements IBaseCommand {
    order = 0;
    command = Commands.START;
    description = 'запускает сессию с ботом. Пока сессия активна, можно общаться с ботом';

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.start(async (ctx: Context) => {
            const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });

            if (!user) {
                this.forNewUser(ctx);
            } else {
                this.forExistedUser(ctx, user);
            }
        });
    }

    async forNewUser(ctx: Context): Promise<void> {
        const newUser: TelegramUserEntity = this.tgUsersRepo.create({
            name: ctx.from.username,
            telegramUserId: ctx.from.id,
            id: null,
            firstName: ctx.from.first_name,
            secondName: ctx.from.last_name,
        });
        const user = await this.tgUsersRepo.save(newUser);
        await this.tgUserSessionRepo.save(this.tgUserSessionRepo.create({ user, chatId: ctx.chat.id, isActive: true }));

        ctx.reply(`Добро пожаловать ${newUser.firstName} ${newUser.secondName}, я сохранил о тебе немного информации =)`);
    }

    async forExistedUser(ctx: Context, user: TelegramUserEntity): Promise<void> {
        const activeSessions = await this.tgUserSessionRepo.findBy({ userId: user.id, isActive: true });
        if (activeSessions.length) {
            void ctx.reply('Уже есть активная сессия');
            return;
        }
        await this.tgUserSessionRepo.save(this.tgUserSessionRepo.create({ user, chatId: ctx.chat.id, isActive: true }));

        void ctx.reply(`Добро пожаловать ${user.firstName} ${user.secondName}, готов ответить на ваши вопросы! =)`);
    }
}
