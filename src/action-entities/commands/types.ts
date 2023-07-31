import { Telegraf } from 'telegraf';

export enum Commands {
    START = 'start',
    LEAVE = 'leave',
    GPT_CHAT = 'gpt',
    STATE = 'state',
    VOICE = 'voice',
    HELP = 'help',
    POWER_CUTS_INFO = 'power_cuts_info',
}

export interface IBaseCommand {
    name: Commands;
    order: number;
    defaultArg?: string;
    description: string;
    bot: Telegraf;

    actions?: KeyboardAction<string>[];
}

export type KeyboardAction<EnumT extends string> = {
    name: EnumT;
    title: string;
    handler: (ctx) => Promise<void>;
    subActions?: KeyboardAction<EnumT>[];
    /**
     * вызвать ли обработчик команды после кнопки
     */
    callCommandHandlerAfterButton?: boolean;
};
