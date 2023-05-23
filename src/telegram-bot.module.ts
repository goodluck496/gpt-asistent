import { Inject, Injectable, Module, Type } from '@nestjs/common';
import * as config from 'config';

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { OpenAiService, OpenaiModule } from './openai.module';
import { Repository } from 'typeorm';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import StartCommand from './bot-commands/start.command';
import { IBaseCommand } from './bot-commands/types';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { LeaveCommand } from './bot-commands/leave.command';
import { GptEnableCommand } from './bot-commands/gpt-on.command';
import { GptDisableCommand } from './bot-commands/gpt-off.command';
import { StateCommand } from './bot-commands/state.command';
import { HelpCommand } from './bot-commands/help.command';
import { MessageEntity } from './database/message.entity';
import { IBaseEvent } from './bot-events/types';
import { TextMessageEvent } from './bot-events/text-message.event';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');

@Injectable()
export class TelegramBotService {
    commands: Type<IBaseCommand>[] = [StartCommand, LeaveCommand, GptEnableCommand, GptDisableCommand, StateCommand, HelpCommand];
    events: Type<IBaseEvent>[] = [TextMessageEvent];

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
            new command().register(this).handle();
        });
    }

    registerEvents(): void {
        this.events.forEach((event) => {
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
                console.log('init telegraf');

                return new Telegraf(TELEGRAM_TOKEN);
            },
        },
        TelegramBotService,
    ],
})
export class TelegramBotModule {}
