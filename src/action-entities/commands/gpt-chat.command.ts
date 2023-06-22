import { Telegraf } from 'telegraf';
import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';
import { SessionsService } from '../../session/sessions.service';
import { SessionOptionKeys } from '../../database/telegram-user-session-options.entity';
import { BaseCommand } from './base.command';
import { OpenAiModels } from '../../openai.module';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';

enum GPT_ACTION_ENUM {
    ENABLE = 'gpt-enable',
    DISABLE = 'gpt-disable',
    CONTEXT_HELP = 'context-help',
    SET_CONTEXT = 'set-context',
    SET_GPT_MODEL = 'set-gpt-model',
}

@Injectable()
export class GptChatCommand extends BaseCommand implements IBaseCommand {
    order = 3;
    name = Commands.GPT_CHAT;
    defaultArg = 'enable';
    description = 'включает и отключает GPT помошника с помощью аргументов enable и disable';
    commandFirst = false;

    actions: KeyboardAction<GPT_ACTION_ENUM>[] = [
        { name: GPT_ACTION_ENUM.ENABLE, title: 'Включить', handler: (ctx) => this.enableGpt(ctx) },
        { name: GPT_ACTION_ENUM.DISABLE, title: 'Выключить', handler: (ctx) => this.disableGpt(ctx) },
        {
            name: GPT_ACTION_ENUM.SET_GPT_MODEL,
            title: 'Модель асистента',
            handler: (ctx) => this.setAsistentModel(ctx),
        },
        { name: GPT_ACTION_ENUM.CONTEXT_HELP, title: 'Контекст', handler: (ctx) => this.contextHelp(ctx) },
    ];

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        private readonly sessionService: SessionsService,
    ) {
        super();
        super.registrationHandler();
    }

    applyCommandWithArguments(ctx, action: GPT_ACTION_ENUM, commandAgs) {
        if (action === GPT_ACTION_ENUM.SET_CONTEXT) {
            void this.setSystemMessage(ctx, commandAgs.join(' '));
            return;
        }
        if (action === GPT_ACTION_ENUM.SET_GPT_MODEL) {
            void this.setGptModel(ctx, commandAgs[0]);
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

    private async setAsistentModel(ctx): Promise<void> {
        // ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        ctx.replyWithHTML(`
<b>Чтобы задать модель AI можно воспользоваться командой</b>
<i>/gpt set-gpt-model "${Object.keys(OpenAiModels).join('|')}"</i>
<i>Выберите одну модель и введите без кавычек.</i>
        `);
    }

    private async contextHelp(ctx): Promise<void> {
        // ctx.deleteMessage(ctx.callbackQuery.message.message_id);

        ctx.replyWithHTML(`
<b>Чтобы задать контекст общения с AI можно воспользоваться командой</b>
<i>/gpt set-context "мой контекст, о котором будет знать помошник"</i>
<i>Текст контекста вводится без кавычек.</i>
            `);
    }

    private async setSystemMessage(ctx, message?: string): Promise<void> {
        if (!message) {
            ctx.reply('Вы не ввели системное сообщение для асистента');
            return;
        }

        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }

        await this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.GPT_SYSTEM_MSG, 'string', message);
    }

    private async setGptModel(ctx, model: OpenAiModels): Promise<void> {
        if (!model) {
            ctx.reply('Вы не ввели модель асистента');
            return;
        }

        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            ctx.reply('Для начала нужно ввести команду /start');
            return;
        }

        await this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.GPT_MODEL, 'string', OpenAiModels[model]);
        ctx.reply(`Вы выбрали модель ${model}`);
    }
}
