import * as EventEmitter from 'events';
import { Markup} from 'telegraf';
import { v1 as uuid } from 'uuid';
import {app} from './app';
import { TelegrafContext } from 'telegraf/typings/context';
export interface IButton {
  text: string;
  clicked: () => Promise<boolean>;
}
export class CallbackHandler {
  constructor() {

    // console.log('const');
  }
  callbackEmitter = new EventEmitter();
  responseEmitter = new EventEmitter();
  async handle(ctx: TelegrafContext) {
    // console.log(this, 'This', ctx.callbackQuery);
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      const match = ctx.callbackQuery.data.match(/([^%]+)%([^%]+)%([^%]+)/);
      if (match) {
        this.callbackEmitter.emit(match[1], match[2], match[3], ctx);
      }
    }
  }
  async handleMessage(ctx: TelegrafContext) {
    // console.log(ctx.update);
    if (ctx.update.message && ctx.update.message.reply_to_message) {
      this.responseEmitter.emit('response', ctx.update.message.reply_to_message.chat.id, ctx.update.message.reply_to_message.message_id, ctx.update.message.text, ctx.update.message.message_id);
    }
  }
  getKeyboard(button2d: IButton[][]) {
    // console.log(this);
    const keyboardUuid = uuid();
    const keyboard = button2d.map((button1d, index) => {
      return button1d.map((button, index2) => {
        return Markup.callbackButton(button.text, keyboardUuid + '%' + index + '%' + index2);
      });
    });
    this.callbackEmitter.once(keyboardUuid, async (index: number, index2: number, ctx: TelegrafContext) => {
      console.log('asd', index, index2);
      const clickHandler = button2d[index][index2].clicked;
      if (ctx.callbackQuery && ctx.callbackQuery.message && await clickHandler()) {
        console.log('Deleted callback');
        ctx.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
      }
    });
    return keyboard;
  }
  async getReply(chatId: number, message_id: number): Promise<string> {
    return new Promise(resolve => {
      this.responseEmitter.on('response', async (_chatId: number, _message_id: number, text: string, responseMessageId: number) => {
        console.log('response Emit', _chatId, chatId, _message_id, message_id, text)
        if (chatId === _chatId && message_id === _message_id) {
          app.bot.telegram.deleteMessage(chatId, responseMessageId);
          resolve(text);
        }
      })
    }) as Promise<string>;
  }
}
export const callbackHandler = new CallbackHandler();
