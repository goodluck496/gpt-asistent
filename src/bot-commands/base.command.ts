import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { getCommandArguments } from './helpers';
import { InlineKeyboardButton } from 'typegram/markup';

export class BaseCommand implements IBaseCommand {
    bot: Telegraf;
    command: Commands;
    description = '';
    order = 0;
    deleteActionMessage = true;

    actions: KeyboardAction<string>[] = [];

    registrationHandler(): void {
        this.actions.forEach((el) => {
            if (typeof el.handler !== 'function') {
                console.log(`Отсутсвует обработчик для действия '${el.name}' в команде '${this.command}'`);
                return;
            }
            this.bot.action(el.name, (ctx) => {
                if (this.deleteActionMessage) {
                    ctx.deleteMessage(ctx.callbackQuery.message.message_id);
                }

                el.handler(ctx);
            });
        });

        this.bot.command(this.command, async (ctx: NarrowedContext<Context, any>) => {
            const commandArguments = getCommandArguments(ctx.message.text);
            const action = commandArguments[0];
            const args = commandArguments.slice(1);
            this.applyCommandWithArguments(ctx, action, args);

            if (commandArguments.length) {
                return;
            }

            if (this.actions.length) {
                await ctx.reply('Выбери команду', {
                    reply_markup: {
                        inline_keyboard: [
                            this.actions.map(
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

            this.commandHandler(ctx);
        });
    }

    applyCommandWithArguments(ctx, action: string, commandArguments: string[]): void {
        void 0;
    }

    commandHandler(ctx): void {
        void 0;
    }
}
