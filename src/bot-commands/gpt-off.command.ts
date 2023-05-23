import { Context } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { TelegramBotService } from 'src/telegram-bot.module';

export class GptDisableCommand implements IBaseCommand {
    command = Commands.GPT_OFF;

    service: TelegramBotService;

    handle(): this {
        this.service.bot.command(this.command, async (ctx: Context) => {
            ctx.reply('GPT отключен');

            const user = await this.service.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
            if (!user) {
                return;
            }
            const sessions = await this.service.tgUserSessionRepo.findBy({ user, isActive: true });
            if (!sessions.length) {
                ctx.reply('Для начала нужно ввести команду /start');
                return;
            }
            sessions.forEach((session) => {
                this.service.tgUserSessionRepo.update(session.id, { gptEnable: false });
            });
        });
        return this;
    }

    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
