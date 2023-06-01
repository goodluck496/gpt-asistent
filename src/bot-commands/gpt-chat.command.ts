import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { getCommandArguments } from './helpers';
import { SessionsService } from '../session/sessions.service';
import { SessionOptionKeys } from '../database/telegram-user-session-options.entity';
import { InlineKeyboardButton } from 'typegram/markup';
import { BaseCommand } from './base.command';

enum GPT_ACTION_ENUM {
    ENABLE = 'gpt-enable',
    DISABLE = 'gpt-disable',
    CONTEXT_HELP = 'context-help',
    SET_CONTEXT = 'set-context',
}

export class GptChatCommand extends BaseCommand implements IBaseCommand {
    order = 3;
    command = Commands.GPT_CHAT;
    defaultArg = 'enable';
    description = 'включает и отключает GPT помошника с помощью аргументов enable и disable';

    actions: KeyboardAction<GPT_ACTION_ENUM>[] = [
        { name: GPT_ACTION_ENUM.ENABLE, title: 'Включить', handler: (ctx) => this.enableGpt(ctx) },
        { name: GPT_ACTION_ENUM.DISABLE, title: 'Выключить', handler: (ctx) => this.disableGpt(ctx) },
        { name: GPT_ACTION_ENUM.CONTEXT_HELP, title: 'Задать контекст', handler: (ctx) => this.contextHelp(ctx) },
    ];

    constructor(
        @Inject('TELEGRAM_BOT') public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        private readonly sessionService: SessionsService,
    ) {
        super();
        super.registrationHandler();
    }

    applyCommandWithArguments(ctx, action: string, commandAgs) {
        if (action === GPT_ACTION_ENUM.SET_CONTEXT) {
            void this.setSystemMessage(ctx, commandAgs.join(' '));
            return;
        }
    }

    private async enableGpt(ctx): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }
        ctx.reply('Сейчас будем спрашивать у GPT');

        const gptOption = session.options.find((el) => el.key === SessionOptionKeys.GPT_ENABLE);
        if (gptOption && gptOption.value == String(true)) {
            return;
        }
        await this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.GPT_ENABLE, 'boolean', true);
    }

    private async disableGpt(ctx): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }
        ctx.reply('GPT отключен');

        const gptOption = session.options.find((el) => el.key === SessionOptionKeys.GPT_ENABLE);
        if (gptOption && gptOption.value == String(false)) {
            return;
        }
        await this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.GPT_ENABLE, 'boolean', false);
    }

    private contextHelp(ctx): void {
        ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        ctx.replyWithHTML(`
<b>Чтобы задать контекст общения с AI можно воспользоваться командой</b>
<i>/gpt set-context "мой контекст, о котором будет знать помошник"</i>
<i>Текст контекста вводится без кавычек.</i>
            `);
    }

    private async setSystemMessage(ctx, message?: string): Promise<void> {
        if (!message) {
            ctx.reply('Вы не ввели системное сообдение для асистента');
            return;
        }

        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }

        await this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.GPT_SYSTEM_MSG, 'string', message);
    }
}
