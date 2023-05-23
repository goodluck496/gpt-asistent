import { TelegramBotService } from 'src/telegram-bot.module';
import { Commands, IBaseCommand } from './types';
import { Context } from 'telegraf';
import * as moment from 'moment';

export class StateCommand implements IBaseCommand {
    command = Commands.STATE;
    service: TelegramBotService;

    handle(): this {
        this.service.bot.command(this.command, async (ctx: Context) => {
            const users = await this.service.tgUsersRepo.find({
                relations: { sessions: true },
                where: { telegramUserId: ctx.from.id },
            });
            if (!users.length) {
                return;
            }
            const user = users[0];
            const activeSession = user.sessions?.find((el) => el.isActive);
            if (!activeSession) {
                ctx.reply('Для начала нужно начать сессию введя команду /start');
                return;
            }

            const messageCountInSession = await this.service.messageRepo.findAndCountBy({ session: activeSession });

            ctx.replyWithHTML(`<code>
    GPT - ${activeSession.gptEnable};
    Messages in session - ${messageCountInSession[1]}
    Gpt answers - ${messageCountInSession[0].map((el) => el.gptAnswer).length}
    Session start - ${moment(activeSession.createdAt).format('DD.MM.Y HH:mm:ss')}
</code>`);
        });

        return this;
    }

    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
