import { Context } from 'telegraf';
import { Commands, IBaseCommand } from './types';
import { TelegramBotService } from 'src/telegram-bot.module';

export class LeaveCommand implements IBaseCommand {
    command = Commands.LEAVE;
    service: TelegramBotService;

    handle(): this {
        this.service.bot.command(this.command, async (ctx: Context) => {
            ctx.reply('Приходи еще! =)');
            if (ctx.chat.type !== 'private') {
                try {
                    await ctx.leaveChat();
                } catch (err) {
                    console.log('Ошибка...', err);
                }
            }

            const user = await this.service.tgUsersRepo.findOneBy({ telegramUserId: ctx.from.id });
            if (!user) {
                return;
            }
            const sessions = await this.service.tgUserSessionRepo.find({
                relations: {
                    user: true,
                },
                where: {
                    isActive: true,
                },
            });
            console.log(sessions, user.sessions);

            sessions.forEach(async (session) => {
                console.log('session', session);
                this.service.tgUserSessionRepo.update(session.id, { isActive: false });
            });
        });
        return this;
    }

    register(service: TelegramBotService): this {
        this.service = service;
        return this;
    }
}
