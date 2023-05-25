import { Inject, Injectable, Logger, Module, Provider } from '@nestjs/common';
import * as config from 'config';

import { Markup, Telegraf } from 'telegraf';
import { OpenaiModule, OpenAiService } from './openai.module';
import { Repository } from 'typeorm';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as BotCommands from './bot-commands';
import { IBaseCommand } from './bot-commands';
import * as BotEvents from './bot-events';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { MessageEntity } from './database/message.entity';
import { ModuleRef } from '@nestjs/core';
import { BehaviorSubject, filter } from 'rxjs';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');
const botCommandTokens = Object.keys(BotCommands).filter((c) => c.endsWith('Command'));

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) public readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) public readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
        private readonly moduleRef: ModuleRef,
    ) {
        this.run();
        this.registerBotCommands();
    }

    run(): void {
        this.logger.verbose('Run bot');
        void this.bot.launch();

        this.tgUserSessionRepo.findBy({ isActive: true }).then((sessions) => {
            const chatIds = Array.from(new Set(sessions.map((el) => el.chatId)));
            chatIds.forEach((chatId) => {
                this.bot.telegram.sendMessage(Number(chatId), 'Привет!!! Я снова к вашим услугам');
            });
        });

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    registerBotCommands() {
        const commandInstances: BehaviorSubject<IBaseCommand[]> = new BehaviorSubject([]);
        /**
         * Модули команд не успевают зарегистрироваться и некоторые из них будут undefined
         * для того, чтобы избежать ошибок поставил таймаут
         */
        setTimeout(() => {
            botCommandTokens.forEach(async (command) => {
                const commandRef: IBaseCommand = await this.moduleRef.get(command);
                commandInstances.next([...commandInstances.value, commandRef]);
            });
        }, 0);
        commandInstances.pipe(filter((c) => c.length === botCommandTokens.length)).subscribe((commands) => {
            void this.bot.telegram.setMyCommands(
                commands
                    .sort((a, b) => a.order - b.order)
                    .map((el) => ({
                        command: `${el.command.toLowerCase()}`,
                        description: el.description.toLowerCase(),
                    })),
            );
        });
    }
}

@Module({
    imports: [OpenaiModule, TypeOrmModule.forFeature([TelegramUserEntity, TelegramUserSessionEntity, MessageEntity])],
    controllers: [],
    providers: [
        {
            provide: 'TELEGRAM_BOT',
            useFactory: () => {
                return new Telegraf(TELEGRAM_TOKEN);
            },
        },
        TelegramBotService,
        ...botCommandTokens.map(
            (command) =>
                ({
                    provide: command,
                    useClass: BotCommands[command],
                    inject: ['TELEGRAM_BOT'],
                } as Provider),
        ),
        ...Object.keys(BotEvents)
            .filter((e) => e.endsWith('Event'))
            .map(
                (event) =>
                    ({
                        provide: event,
                        useClass: BotEvents[event],
                        inject: ['TELEGRAM_BOT', OpenAiService],
                    } as Provider),
            ),
    ],
    exports: ['TELEGRAM_BOT'],
})
export class TelegramBotModule {}
