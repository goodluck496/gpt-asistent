import { Inject, Injectable, Logger, Module, Provider } from '@nestjs/common';
import * as config from 'config';

import { Telegraf } from 'telegraf';
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
import { SessionsModule } from './session/sessions.module';
import { SessionsService } from './session/sessions.service';

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

        this.bot.command('test', (ctx) => {
            console.log('test command', ctx.message.text);
        });

        void this.bot.launch();

        this.tgUserSessionRepo.findBy({ isActive: true }).then((sessions) => {
            const chatIds = Array.from(new Set(sessions.map((el) => el.chatId)));
            chatIds.forEach((chatId) => {
                this.bot.telegram.sendMessage(Number(chatId), 'Привет!!! Я снова к вашим услугам', {
                    reply_markup: { remove_keyboard: true },
                });
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
                this.logger.log(`command '${commandRef.command}' registered`);
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
    imports: [
        OpenaiModule,
        SessionsModule,
        TypeOrmModule.forFeature([TelegramUserEntity, TelegramUserSessionEntity, MessageEntity]),
    ],
    controllers: [],
    providers: [
        {
            provide: 'TELEGRAM_BOT',
            useFactory: () => {
                return new Telegraf(TELEGRAM_TOKEN, {});
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
            .map((event) => {
                return {
                    provide: event,
                    useClass: BotEvents[event],
                    // useFactory: (tgBot: Telegraf, aiService: OpenAiService, session: SessionsService) => {
                    //     //todo если допустить, что обработчик сообщений будет зареган раньше команд,
                    //     // то команды работать не будут
                    //     // https://ru.stackoverflow.com/questions/1256165/telegram-%D0%B1%D0%BE%D1%82-%D0%BD%D0%B5-%D1%80%D0%B5%D0%B0%D0%B3%D0%B8%D1%80%D1%83%D0%B5%D1%82-%D0%BD%D0%B0-%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D1%8B-python-telebot
                    //     // setTimeout(() => {
                    //     return new BotEvents[event](tgBot, aiService, session);
                    //     // }, 100);
                    // },
                    inject: ['TELEGRAM_BOT', OpenAiService, SessionsService],
                } as Provider;
            }),
    ],
    exports: ['TELEGRAM_BOT'],
})
export class TelegramBotModule {}
