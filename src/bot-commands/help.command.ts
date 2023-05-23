import { TelegramBotService } from 'src/telegram-bot.module';
import { Commands, IBaseCommand } from './types';
import { Context } from 'telegraf';

export class HelpCommand implements IBaseCommand {
    command = Commands.GPT_ON;
    service: TelegramBotService;

    handle(): this {
        this.service.bot.help((ctx: Context) => {
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
        return this;
    }
    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
