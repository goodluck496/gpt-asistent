import { Telegraf } from 'telegraf';

export enum Commands {
    START = 'start',
    LEAVE = 'leave',
    GPT_ON = 'gptEnable',
    GPT_OFF = 'gptDisable',
    STATE = 'state',
    HELP = 'help',
}

export interface IBaseCommand {
    order: number;
    command: Commands;
    description: string;
    bot: Telegraf;

    handle(): void;
}
