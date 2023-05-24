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

    handle(): void;
}
