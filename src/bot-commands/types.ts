import { Telegraf } from 'telegraf';

export enum Commands {
    START = 'start',
    LEAVE = 'leave',
    GPT_CHAT = 'gptchat',
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

    handle(): void;
}
