import { Inject, Injectable, Logger, Type } from '@nestjs/common';
import { TELEGRAM_ACTION_ENTITY_TOKENS, TELEGRAM_BOT_TOKEN } from './tokens';
import { Context, Telegraf } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { MessageEntity } from './database/message.entity';
import { ModuleRef } from '@nestjs/core';
import { SessionsService } from './session/sessions.service';
import { Subject } from 'rxjs';
import { Commands, IBaseCommand } from './action-entities/commands';
import { Update } from 'typegram';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from './types';

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(TELEGRAM_ACTION_ENTITY_TOKENS) public readonly telegramEntities: Type<IBaseTelegramActionEntity>[],
        @InjectRepository(TelegramUserEntity) public readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) public readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
        private readonly moduleRef: ModuleRef,
        private readonly sessionService: SessionsService,
    ) {
        this.run();
        this.registerBotActions();
        this.registerMiddlewares();
    }

    run(): void {
        this.logger.verbose('Run bot');

        void this.bot.launch();

        this.tgUserSessionRepo.findBy({ isActive: true }).then((sessions) => {
            const chatIds = Array.from(new Set(sessions.map((el) => el.chatId)));
            chatIds.forEach((chatId) => {
                // this.bot.telegram.sendMessage(Number(chatId), 'Привет!!! Я снова к вашим услугам', {
                //     reply_markup: { remove_keyboard: true },
                // });
            });
        });

        process.once('SIGINT', () => {
            console.log('SIGINT');
            this.bot.stop('SIGINT');
        });
        process.once('SIGTERM', () => {
            console.log('SIGTERM');
            this.bot.stop('SIGTERM');
        });
    }

    registerBotActions() {
        const commandInstances: Subject<IBaseCommand[]> = new Subject();
        /**
         * Модули команд не успевают зарегистрироваться и некоторые из них будут undefined
         * для того, чтобы избежать ошибок, поставил таймаут
         */
        setTimeout(async () => {
            const commands = [];
            await Promise.all(
                this.telegramEntities.map(async (item) => {
                    const ref: IBaseTelegramActionEntity = await this.moduleRef.get(item.name);
                    this.logger.verbose(`${ref.type} '${ref.name}' registered`);

                    if (ref.type === TELEGRAM_ACTION_TYPES.COMMAND) {
                        const commandRef = ref as unknown as IBaseCommand;
                        commands.push(commandRef);
                    }
                }),
            );
            commandInstances.next(commands);
        }, 1000);
        commandInstances.subscribe(async (commands) => {
            // await this.bot.telegram.deleteMyCommands();
            // return;
            void this.bot.telegram.setMyCommands(
                commands
                    .sort((a, b) => a.order - b.order)
                    .map((el) => ({
                        command: el.name.toLowerCase(),
                        description: el.description.toLowerCase(),
                    })),
            );
        });
    }

    registerMiddlewares(): void {
        this.bot.use(async (ctx: Context<Update> | Context<Update.MessageUpdate>, next: () => void) => {
            const message = (ctx as Context<Update.MessageUpdate>).update.message;

            if (message && 'text' in message && message.text === `/${Commands.START}`) {
                next();
                return;
            }
            const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
            if (!session) {
                await ctx.reply(`Для начала нужно ввести команду /${Commands.START}`);
                return;
            }
            next();
        });
    }
}
