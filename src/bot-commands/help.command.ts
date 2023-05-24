import { Commands, IBaseCommand } from './types';
import { Context, Telegraf } from 'telegraf';
import { Inject } from '@nestjs/common';

export class HelpCommand implements IBaseCommand {
    command = Commands.HELP;

    constructor(@Inject('TELEGRAM_BOT') private readonly bot: Telegraf) {
        this.handle();
    }

    handle(): void {
        this.bot.help((ctx: Context) => {
            ctx.reply(
                `
** Доступные команды **
${Object.values(Commands).reduce((acc, cur) => {
    acc += '/' + cur + '\r\n';
    return acc;
}, '')}
                `,
            );
        });
    }
}
