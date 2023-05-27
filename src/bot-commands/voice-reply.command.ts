import { Commands, IBaseCommand } from './types';
import { Telegraf } from 'telegraf';

export class VoiceReplyCommand implements IBaseCommand {
    bot: Telegraf;
    command: Commands = Commands.VOICE;
    defaultArg = 'enabled';
    description = 'аргументами enable или disable для ответов с помощью голосовых сообщений';
    order = 4;

    handle(): void {}
}
