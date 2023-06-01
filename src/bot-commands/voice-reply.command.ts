import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Telegraf } from 'telegraf';
import { SessionsService } from '../session/sessions.service';
import { SessionOptionKeys } from '../database/telegram-user-session-options.entity';
import { Inject } from '@nestjs/common';
import { BaseCommand } from './base.command';

enum VOICE_ACTION_ENUM {
    ENABLE = 'voice-enable',
    DISABLE = 'voice-disable',
    VOICE_SEX_HELP = 'voice-sex-help',
    SET_SEX = 'set-sex',
}

export class VoiceReplyCommand extends BaseCommand implements IBaseCommand {
    command: Commands = Commands.VOICE;
    defaultArg = 'enabled';
    description = 'аргументами enable или disable для ответов с помощью голосовых сообщений';
    order = 4;

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

    constructor(@Inject('TELEGRAM_BOT') public readonly bot: Telegraf, private readonly sessionService: SessionsService) {
        super();
        super.registrationHandler();
    }

    applyCommandWithArguments(ctx, action: string, commandAgs) {
        if (action === VOICE_ACTION_ENUM.SET_SEX) {
            return this.updateVoiceOption(ctx, 'sex', commandAgs[0]);
        }
    }

    private async updateVoiceOption(
        ctx,
        value: 'enable' | 'disable' | 'sex' | unknown,
        additionalValue?: string,
    ): Promise<unknown> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            return;
        }
        if (!value || value === 'enable') {
            ctx.reply('Ответы теперь будут голосом!');
            return this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', true);
        }
        if (value === 'disable') {
            ctx.reply('Ответы будут текстом!');
            return this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', false);
        }

        if (value === 'sex') {
            const sexString = additionalValue === 'male' ? 'мужской' : 'женский';
            ctx.reply(`Голос диктора теперь ${sexString}`);
            return this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_SEX, 'string', additionalValue);
        }

        return Promise.resolve();
    }

    private voiceSexHelp(ctx) {
        ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        ctx.replyWithHTML(`
<b>Чтобы задать пол диктора нужно воспользоваться командой</b>
<i>/voice set-sex "male" или "female"</i>
<i>Текст вводится без кавычек.</i>
            `);
    }
}
