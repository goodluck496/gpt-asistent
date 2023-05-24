import { Inject, Injectable, Logger, Module, Provider, Type } from '@nestjs/common';
import * as config from 'config';

import { Telegraf } from 'telegraf';
import { OpenaiModule, OpenAiService } from './openai.module';
import { Repository } from 'typeorm';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as BotCommands from './bot-commands';
import * as BotEvents from './bot-events';
import { IBaseCommand } from './bot-commands';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { MessageEntity } from './database/message.entity';
import { IBaseEvent } from './bot-events/types';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);

    commands: Type<IBaseCommand>[] = Object.keys(BotCommands)
        .filter((c) => c.endsWith('Command'))
        .map((command) => BotCommands[command]);
    events: Type<IBaseEvent>[] = Object.keys(BotEvents)
        .filter((e) => e.endsWith('Event'))
        .map((event) => BotEvents[event]);

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) public readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) public readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
        public readonly openAiService: OpenAiService,
    ) {
        this.registerCommands();
        this.registerEvents();
        this.run();
    }

    registerCommands(): void {
        this.commands.forEach((command) => {
            this.logger.log(`Register command - ${command.name}`);
            new command().register(this).handle();
        });
    }

    registerEvents(): void {
        this.events.forEach((event) => {
            this.logger.log(`Register event - ${event.name}`);
            new event().register(this).handle();
        });
    }

    run(): void {
        this.bot.launch();

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
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

        ...Object.keys(BotCommands)
            .filter((c) => c.endsWith('Command'))
            .map(
                (command) =>
                    ({
                        provide: command,
                        useClass: BotCommands[command],
                    } as Provider),
            ),
    ],
})
export class TelegramBotModule {}
