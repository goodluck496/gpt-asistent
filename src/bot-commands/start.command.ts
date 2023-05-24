import { Context, Telegraf } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { TelegramUserEntity } from 'src/database/telegram-user.entity';
import { TelegramBotService } from '../telegram-bot.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class StartCommand implements IBaseCommand {
    command = Commands.START;
    service: TelegramBotService;

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
    ) {
        console.log('bot --- ', this.bot);
    }

    handle(): this {
        this.service.bot.start(async (ctx: Context) => {
            const user = await this.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });

            if (!user) {
                this.forNewUser(ctx);
            } else {
                this.forExistedUser(ctx, user);
            }
        });

        return this;
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
        await this.tgUserSessionRepo.save(this.tgUserSessionRepo.create({ user, isActive: true }));

        ctx.reply(`Добро пожаловать ${newUser.firstName} ${newUser.secondName}, я сохранил о тебе немного информации =)`);
    }

    async forExistedUser(ctx: Context, user: TelegramUserEntity): Promise<void> {
        await this.tgUserSessionRepo.save(this.tgUserSessionRepo.create({ user, isActive: true }));

        ctx.reply(`Добро пожаловать ${user.firstName} ${user.secondName}, готов ответить на ваши вопросы! =)`);
    }

    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
