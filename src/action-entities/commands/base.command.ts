import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { getCommandArguments } from './helpers';
import { InlineKeyboardButton } from 'typegram/markup';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';
import { Update } from 'typegram/update';

export class BaseCommand implements IBaseCommand, IBaseTelegramActionEntity {
    name: Commands;
    type = TELEGRAM_ACTION_TYPES.COMMAND;
    bot: Telegraf;
    description = '';
    order = 0;
    deleteActionMessage = true;

    /**
     * если параметр задан как TRUE, то сначала будет выполняться обработчик команды
     * обработка для массива actions вызывается вручную функцией applyActions
     */
    commandFirst = true;

    /**
     * Массив кнопок которые отобразяться после ввода команды
     */
    actions: KeyboardAction<string>[] = [];

    registrationActions(actions: KeyboardAction<string>[]) {
        actions.forEach((el) => {
            if (typeof el.handler !== 'function') {
                console.log(`Отсутсвует обработчик для действия '${el.name}' в команде '${this.name}'`);
                return;
            }

            this.bot.action(el.name, async (ctx: Context<Update.CallbackQueryUpdate>) => {
                if (this.deleteActionMessage) {
                    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
                }

                await el.handler(ctx);

                if (el.subActions?.length) {
                    this.registrationActions(el.subActions);
                    void this.applyActions(ctx, undefined, el.subActions);
                }

                if (el.callCommandHandlerAfterButton) {
                    this.commandHandler('action', ctx);
                }
            });
        });
    }

    registrationHandler(): void {
        this.registrationActions(this.actions);

        this.bot.command(this.name, async (ctx: NarrowedContext<Context, any>) => {
            const commandArguments = getCommandArguments(ctx.message.text);
            const action = commandArguments[0];
            const args = commandArguments.slice(1);
            this.applyCommandWithArguments(ctx, action, args);

            if (commandArguments.length) {
                return;
            }

            if (this.commandFirst) {
                this.commandHandler('command', ctx);
                return;
            }
            if (this.actions.length) {
                void this.applyActions(ctx);
            }
        });
    }

    async applyActions(
        ctx: Context<Update> | Context<Update.CallbackQueryUpdate>,
        replyText = 'Выбери команду',
        actions = this.actions,
    ): Promise<void> {
        await ctx.reply(replyText, {
            reply_markup: {
                inline_keyboard: [
                    actions.map(
                        (el) =>
                            ({
                                text: el.title,
                                callback_data: el.name,
                            } as InlineKeyboardButton.CallbackButton),
                    ),
                ],
                one_time_keyboard: true,
            },
        });
    }

    applyCommandWithArguments(ctx, action: string, commandArguments: string[]): void {
        void 0;
    }

    commandHandler(from: 'action' | 'command', ctx: Context<Update> | Context<Update.CallbackQueryUpdate>): void {
        void 0;
    }
}
