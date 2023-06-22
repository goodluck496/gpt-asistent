import { Commands } from './types';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../../database/message.entity';
import { BaseCommand } from './base.command';
import { SessionsService } from '../../session/sessions.service';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';

@Injectable()
export class StateCommand extends BaseCommand {
    order = 2;
    name = Commands.STATE;
    description = 'возвращает краткий список параметров сессии';

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        private sessionService: SessionsService,
        @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    ) {
        super();
        super.registrationHandler();
    }

    async commandHandler(from, ctx) {
        const activeSession = await this.sessionService.getActiveSessionByChatId(ctx.from.id);

        const messageCountInSession = await this.messageRepo.findAndCountBy({ sessionId: activeSession.id });

        const sessionOptions = activeSession.options;

        ctx.replyWithHTML(`<code>
[options]
${sessionOptions.map((el) => el.key + ' - ' + el.value).join('\r\n')}

[any params]    
Gpt answers - ${messageCountInSession[0].map((el) => el.gptAnswer).length}
Session start - ${moment(activeSession.createdAt).format('DD.MM.Y HH:mm:ss')}
</code>`);
    }
}
