import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Telegraf } from 'telegraf';
import { SessionsService } from '../../session/sessions.service';
import { SessionOptionKeys } from '../../database/telegram-user-session-options.entity';
import { Inject, Injectable } from '@nestjs/common';
import { BaseCommand } from './base.command';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';

enum VOICE_ACTION_ENUM {
    ENABLE = 'enable',
    DISABLE = 'disable',
    VOICE_SEX_HELP = 'sex-help',
    SET_SEX = 'set-sex',
}

@Injectable()
export class VoiceReplyCommand extends BaseCommand implements IBaseCommand {
    name: Commands = Commands.VOICE;
    defaultArg = 'enabled';
    description = 'аргументами enable или disable для ответов с помощью голосовых сообщений';
    order = 4;
    commandFirst = false;

    actions: KeyboardAction<VOICE_ACTION_ENUM>[] = [
        { name: VOICE_ACTION_ENUM.ENABLE, title: 'Включить', handler: (ctx) => this.updateVoiceOption(ctx, 'enable') },
        {
            name: VOICE_ACTION_ENUM.DISABLE,
            title: 'Выключить',
            handler: (ctx) => this.updateVoiceOption(ctx, 'disable'),
        },
        {
            name: VOICE_ACTION_ENUM.VOICE_SEX_HELP,
            title: 'Указать пол диктора',
            handler: (ctx) => this.voiceSexHelp(ctx),
        },
    ];

    constructor(@Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf, private readonly sessionService: SessionsService) {
        super();
        super.registrationHandler();
    }

    applyCommandWithArguments(ctx, action: string, commandAgs) {
        if (action === VOICE_ACTION_ENUM.SET_SEX) {
            return this.updateVoiceOption(ctx, 'sex', commandAgs[0]);
        }
        if (action === VOICE_ACTION_ENUM.ENABLE) {
            return this.updateVoiceOption(ctx, 'enable');
        }
        if (action === VOICE_ACTION_ENUM.DISABLE) {
            return this.updateVoiceOption(ctx, 'disable');
        }
    }

    private async updateVoiceOption(ctx, value: 'enable' | 'disable' | 'sex' | unknown, additionalValue?: string): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            return void 0;
        }
        if (!value || value === 'enable') {
            ctx.reply('Ответы теперь будут голосом!');
            this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', true);
            return void 0;
        }
        if (value === 'disable') {
            ctx.reply('Ответы будут текстом!');
            this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', false);
            return void 0;
        }

        if (value === 'sex') {
            const sexString = additionalValue === 'male' ? 'мужской' : 'женский';
            ctx.reply(`Голос диктора теперь ${sexString}`);
            this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_SEX, 'string', additionalValue);
            return void 0;
        }

        return Promise.resolve();
    }

    private async voiceSexHelp(ctx): Promise<void> {
        ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        ctx.replyWithHTML(`
<b>Чтобы задать пол диктора нужно воспользоваться командой</b>
<i>/voice set-sex "male" или "female"</i>
<i>Текст вводится без кавычек.</i>
            `);
    }
}
