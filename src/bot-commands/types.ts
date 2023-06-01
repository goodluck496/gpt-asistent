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
    order: number;
    command: Commands;
    defaultArg?: string;
    description: string;
    bot: Telegraf;

    actions?: KeyboardAction<unknown>[];

    registrationHandler(): void;
}

export type KeyboardAction<EnumT> = {
    name: EnumT;
    title: string;
    handler: (ctx) => void;
};
