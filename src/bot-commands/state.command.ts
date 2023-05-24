import { Commands, IBaseCommand } from './types';
import { Context, Telegraf } from 'telegraf';
import * as moment from 'moment';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { MessageEntity } from '../database/message.entity';

export class StateCommand implements IBaseCommand {
    command = Commands.STATE;

    constructor(
        @Inject('TELEGRAM_BOT') private readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    ) {
        this.handle();
    }

    handle(): void {
        this.bot.command(this.command, async (ctx: Context) => {
            const users = await this.tgUsersRepo.find({
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

            const messageCountInSession = await this.messageRepo.findAndCountBy({ session: activeSession });

            ctx.replyWithHTML(`<code>
    GPT - ${activeSession.gptEnable};
    Messages in session - ${messageCountInSession[1]}
    Gpt answers - ${messageCountInSession[0].map((el) => el.gptAnswer).length}
    Session start - ${moment(activeSession.createdAt).format('DD.MM.Y HH:mm:ss')}
</code>`);
        });
    }
}
