import { Telegraf } from 'telegraf';

export enum Commands {
    START = 'start',
    LEAVE = 'leave',
    GPT_CHAT = 'gpt',
    STATE = 'state',
    VOICE = 'voice',
    HELP = 'help',
}

export interface IBaseCommand {
    name: Commands;
    order: number;
    defaultArg?: string;
    description: string;
    bot: Telegraf;

    actions?: KeyboardAction<unknown>[];
}

export type KeyboardAction<EnumT> = {
    name: EnumT;
    title: string;
    handler: (ctx) => Promise<void>;
    /**
     * вызвать ли обработчик команды после кнопки
     */
    callCommandHandlerAfterButton?: boolean;
};
