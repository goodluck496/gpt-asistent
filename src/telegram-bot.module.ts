import { Inject, Injectable, Logger, Module, Provider } from '@nestjs/common';
import * as config from 'config';

import { Telegraf } from 'telegraf';
import { OpenaiModule, OpenAiService } from './openai.module';
import { Repository } from 'typeorm';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as BotCommands from './bot-commands';
import * as BotEvents from './bot-events';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { MessageEntity } from './database/message.entity';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) public readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) public readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(MessageEntity) public readonly messageRepo: Repository<MessageEntity>,
        public readonly openAiService: OpenAiService,
    ) {
        this.run();
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
