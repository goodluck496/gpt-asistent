import { TelegramUserSessionEntity } from 'src/database/telegram-user-session-entity';
import { TelegramUserEntity } from 'src/database/telegram-user.entity';
import { TelegramBotService } from '../telegram-bot.module';

export enum Commands {
    START = 'start',
    LEAVE = 'leave',
    GPT_ON = 'gptEnable',
    GPT_OFF = 'gptDisable',
    STATE = 'state',
    HELP = 'help',
}

export interface IBaseCommand {
    command: Commands;
    service: TelegramBotService;

    handle(): this;

    register(service: TelegramBotService): this;
}
