import { Context, Telegraf } from 'telegraf';
import { Commands, KeyboardAction } from './types';
import { TelegramUserEntity } from 'src/database/telegram-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';
import { Inject, Injectable } from '@nestjs/common';
import { BaseCommand } from './base.command';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { Update } from 'typegram/update';
import { SessionsService } from '../../session/sessions.service';

enum START_ACTION_ENUM {
    RESET_SESSION = 'reset-session',
    RESUME = 'resume',
}

@Injectable()
export class StartCommand extends BaseCommand {
    order = 0;
    name = Commands.START;
    description = 'запускает сессию с ботом. Пока сессия активна, можно общаться с ботом';

    actions: KeyboardAction<START_ACTION_ENUM>[] = [
        { name: START_ACTION_ENUM.RESET_SESSION, title: 'Сбросить?', handler: (ctx) => this.resetSession(ctx) },
        { name: START_ACTION_ENUM.RESUME, title: 'Продолжить', handler: (ctx) => this.resumeSession(ctx) },
    ];

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        private sessionService: SessionsService,
    ) {
        super();
        super.registrationHandler();
    }

    async commandHandler(from, ctx) {
        const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });

        const activeSessions = await this.tgUserSessionRepo.findBy({ userId: user.id, isActive: true });
        if (activeSessions.length) {
            void this.applyActions(ctx);
            return;
        }

        if (!user) {
            void this.forNewUser(ctx);
        } else {
            void this.forExistedUser(ctx, user);
        }
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
        await this.tgUserSessionRepo.save(
            this.tgUserSessionRepo.create({ user, tgUserId: user.telegramUserId, chatId: ctx.chat.id, isActive: true }),
        );

        ctx.reply(`Добро пожаловать ${newUser.firstName} ${newUser.secondName}, я сохранил о тебе немного информации =)`);
    }

    async forExistedUser(ctx: Context, user: TelegramUserEntity): Promise<void> {
        // const activeSessions = await this.tgUserSessionRepo.findBy({ userId: user.id, isActive: true });
        // if (activeSessions.length) {
        //     void ctx.reply('Уже есть активная сессия');
        //     return;
        // }
        await this.tgUserSessionRepo.save(
            this.tgUserSessionRepo.create({ user, tgUserId: user.telegramUserId, chatId: ctx.chat.id, isActive: true }),
        );

        void ctx.reply(`Добро пожаловать ${user.firstName} ${user.secondName}, готов ответить на ваши вопросы! =)`);
    }

    async resetSession(ctx: Context<Update.CallbackQueryUpdate>): Promise<void> {
        await ctx.sendChatAction('typing');

        const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
        await this.sessionService.resetSession(ctx.from.id, user.id);

        void ctx.reply('Готово! Сессия сброшена');
    }

    async resumeSession(ctx: Context<Update.CallbackQueryUpdate>): Promise<void> {
        try {
            await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        } catch (err) {
            console.log('Ошибка удаления сообщения', ctx.update.callback_query.message);
            // ctx.reply(JSON.stringify(err, null, 4));
        }
    }
}
