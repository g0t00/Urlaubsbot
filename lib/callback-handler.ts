import * as EventEmitter from 'events';
import { Context, Markup } from 'telegraf';
import { Update, User } from 'telegraf/typings/core/types/typegram';
import { WizardContextWizard } from 'telegraf/typings/scenes';
import { v1 as uuid } from 'uuid';
import { MatchedContext } from './add';
import { app } from './app';
export interface IButton {
  text: string;
  clicked: (from: User) => Promise<boolean|void>;

}
export class CallbackHandler {
  constructor() {

    // console.log('const');
  }
  callbackEmitter = new EventEmitter();
  responseEmitter = new EventEmitter();
  async handle(ctx: MatchedContext<Context<Update>, "callback_query">) {
    const match = (ctx.callbackQuery as any).data.match(/([^%]+)%([^%]+)%([^%]+)/);
    if (match) {
      this.callbackEmitter.emit(match[1], match[2], match[3], ctx);
    }
  }
  async handleMessage(ctx: Context<Update>) {
    // console.log(ctx.update);
    if (ctx.message && (ctx.message as any).reply_to_message) {
      this.responseEmitter.emit('response', (ctx.message as any).reply_to_message.chat.id, (ctx.message as any).reply_to_message.message_id, (ctx.message as any).text, ctx.message.message_id);
    }
  }
  getKeyboard(button2d: IButton[][]) {
    // console.log(this);
    const keyboardUuid = uuid();
    const keyboard = button2d.map((button1d, index) => {
      return button1d.map((button, index2) => {
        return Markup.button.callback(button.text, keyboardUuid + '%' + index + '%' + index2);
      });
    });
    this.callbackEmitter.once(keyboardUuid, async (index: number, index2: number, ctx: Context<Update> & { match: RegExpMatchArray }) => {
      console.log('asd', index, index2);
      const clickHandler = button2d[index][index2].clicked;
      if (ctx.callbackQuery && ctx.callbackQuery.message && await clickHandler(ctx.callbackQuery.from) === true) {
        console.log('Deleted callback');
        try {
          ctx.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
        } catch(err) {

        }
      }
    });
    return keyboard;
  }
  async getReply(chatId: number, message_id: number): Promise<string> {
    return new Promise(resolve => {
      this.responseEmitter.on('response', async (_chatId: number, _message_id: number, text: string, responseMessageId: number) => {
        if (chatId === _chatId && message_id === _message_id) {
          app.bot.telegram.deleteMessage(chatId, responseMessageId);
          resolve(text);
        }
      })
    }) as Promise<string>;
  }
}
export const callbackHandler = new CallbackHandler();
