import { Module, Provider, Type } from '@nestjs/common';
import * as config from 'config';

import { Telegraf } from 'telegraf';
import { OpenaiModule } from './openai.module';
import { TelegramUserEntity } from './database/telegram-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as BotCommands from './action-entities/commands';
import * as BotEvents from './action-entities/events';
import * as BotScenario from './action-entities/scenaries';
import { TelegramUserSessionEntity } from './database/telegram-user-session-entity';
import { MessageEntity } from './database/message.entity';
import { SessionsModule } from './session/sessions.module';
import { VoiceModule } from './voice/voice.module';
import { FileSaveModule } from './file-save/file-save.module';
import { TELEGRAM_ACTION_ENTITY_TOKENS, TELEGRAM_BOT_TOKEN } from './tokens';
import { TelegramBotService } from './telegram-bot.service';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');

/**
 * При добавлении сущностей с которыми работает telegram - добавить их в values()
 */
const telegramEntities = Object.values({ ...BotCommands, ...BotEvents, ...BotScenario }).filter((el) => el && 'name' in el);

const PROVIDERS: Provider[] = [
    ...telegramEntities.map((el: Type) => ({
        provide: el.name,
        useClass: el,
    })),
    {
        provide: TELEGRAM_ACTION_ENTITY_TOKENS,
        useValue: telegramEntities,
    },
];

@Module({
    imports: [
        OpenaiModule,
        SessionsModule,
        VoiceModule,
        FileSaveModule,
        TypeOrmModule.forFeature([TelegramUserEntity, TelegramUserSessionEntity, MessageEntity]),
    ],
    controllers: [],
    providers: [
        {
            provide: TELEGRAM_BOT_TOKEN,
            useFactory: () => {
                return new Telegraf(TELEGRAM_TOKEN, {});
            },
        },
        TelegramBotService,
        ...PROVIDERS,
    ],
    exports: [TELEGRAM_BOT_TOKEN, ...PROVIDERS],
})
export class TelegramBotModule {}
