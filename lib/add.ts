import { Composer, Context, Markup, NarrowedContext } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import * as tt from 'telegraf/typings/telegram-types';
import { app } from './app';
import { callbackHandler } from './callback-handler';
import { GroupModel } from './group';
import { Member } from './member';
export const addMiddleware = new Composer();

export type MatchedContext<
  C extends Context,
  T extends tt.UpdateType | tt.MessageSubType
> = NarrowedContext<C, tt.MountMap[T]>
addMiddleware.command('add', ctx => {
  add(ctx, false);
});
addMiddleware.command('addpartial', ctx => {
  addPartial(ctx, false);
});
addMiddleware.command('addpartialforeign', ctx => {
  addPartial(ctx, true);
});
addMiddleware.command('addforeign', ctx => {
  add(ctx, true);
});
addMiddleware.command('addother', ctx => {
  addOther(ctx, false);
});
addMiddleware.command('addotherforeign', ctx => {
  addOther(ctx, true);
});
const selective = false;
async function addOther(ctx: MatchedContext<Context<Update>, "text">, useForeign: boolean) {
  const { message, reply, chat, telegram } = ctx;
  if (!chat || !message || !message.text || !message.entities || !message.from) {
    return;
  }
  const memberId = message.from.id;
  const groupObj = await GroupModel.findOne({ telegramId: chat.id });
  if (!groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  if (groupObj.state !== 'initial' && groupObj.state !== 'readyCheck') {
    ctx.reply(`Group state is ${groupObj.state}`);
    return;
  }

  const messageText = message.text.substr(message.entities[0].length + 1);
  let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);
  while (!matches) {
    const replyObj = await ctx.reply(`No Amount found! Reply With Amount please.@${message.from.username}`, {
      reply_markup: { force_reply: true, selective: true }
    });
    let amount = await callbackHandler.getReply(chat.id, replyObj.message_id);
    matches = amount.match(/\d+[.,]?\d*/);
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
  }
  let amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    ctx.reply('Could not parse Amount!');
    return;
  }
  if (useForeign) {
    if (!groupObj.currency) {
      return ctx.reply('Currency not set!');
    }
    amount /= groupObj.currency;
  }
  let description = messageText.replace(/\d+[.,]?\d*/, '').trim();
  if (description === '') {
    const replyObj = await ctx.reply(`Please enter description.@${message.from.username}`, {
      reply_markup: { force_reply: true, selective: true }
    });
    description = await callbackHandler.getReply(chat.id, replyObj.message_id);
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
  }
  const { members } = groupObj;
  const buttons = members.map(member => {
    return [{
      text: member.name,
      clicked: async () => {
        await groupObj.addEntry(member.id, description, amount);
        return true;
      }
    }];
  });
  buttons.push([{
    text: 'Cancel',
    clicked: async () => { return true }
  }]);
  const keyboard = callbackHandler.getKeyboard(buttons);
  // keyboard.push([Markup.callbackButton('cancel', 'c')]);
  return ctx.reply(`Entry preview: "${description}: ${amount}".\nPlease select member.`,
    Markup
      .inlineKeyboard(keyboard)
  );
};
async function add(ctx: MatchedContext<Context<Update>, "text">, useForeign: boolean) {
  const { chat, message, telegram } = ctx;
  if (!chat || !message || !message.from || !message.entities) {
    return ctx.reply('nope');
  }
  const from = message.from;
  const groupObj = await GroupModel.findOne({ telegramId: chat.id });

  if (!groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  if (groupObj.state !== 'initial' && groupObj.state !== 'readyCheck') {
    ctx.reply(`Group state is ${groupObj.state}`);
    return;
  }
  let member = groupObj.getMemberById(message.from.id);
  if (!groupObj.members.find(member => member.id === from.id) && !groupObj.groupBannedUsers.find(member => member.id === from.id)) {
    await groupObj.addMember(message.from.first_name, message.from.id)
    member = groupObj.getMemberById(message.from.id);
  }
  if (!member) {
    return ctx.reply('User banned!');
  }
  const group = groupObj;

  const memberId = message.from.id;
  let amount: number;
  let description: string;
  let matches: RegExpMatchArray;
  let messageText;
  if (message.text) {
    messageText = message.text.substr(message.entities[0].length + 1);
  }

  if (!message.text || messageText == '') {
    let replyObj = await ctx.reply(`Please enter description. @${message.from.username}`, {
      reply_markup: { force_reply: true, selective: true }
    });

    description = await callbackHandler.getReply(chat.id, replyObj.message_id);
    console.log('before try message');
    try {
      await app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
    } catch (err) {
      console.log('caught delete message');
      // do not care
    }
    replyObj = await ctx.reply(`Please enter amount. @${message.from.username}`,
      {
        reply_markup: { force_reply: true, selective: true }
      });

    let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
    amount = parseFloat(amountText.replace(',', '.'));
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    while (!Number.isFinite(amount)) {
      const replyObj = await ctx.reply(`Could not parse amount. Please enter valid amount! @${message.from.username}`, {
        reply_markup: { force_reply: true, selective: true }
      });

      amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      amount = parseFloat(amountText.replace(',', '.'));
      app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
    }
  } else {
    messageText = message.text.substr(message.entities[0].length + 1);
    let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);

    while (!matches) {
      const replyObj = await ctx.reply(`No Amount found! Reply With Amount please.@${message.from.username}`, {
        reply_markup: { force_reply: true, selective: true }
      });
      let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      matches = amountText.match(/\d+[.,]?\d*/);

    }
    amount = parseFloat(matches[0].replace(',', '.'));
    if (isNaN(amount)) {
      ctx.reply('Could not parse Amount!');
      return;
    }
    description = messageText.replace(/(-\s?)?\d+[.,]?\d*/, '').trim();
    if (description === '') {
      description = 'no desc';
    }
  }
  if (useForeign) {
    if (!group.currency) {
      return ctx.reply('Currency not set!');
    }
    amount /= group.currency;
  }
  if (!group.addEntry(memberId, description, amount)) {
    ctx.reply('Error while adding!');
  }
};
async function addPartial(ctx: MatchedContext<Context<Update>, "text">, useForeign: boolean) {
  const { chat, message, telegram } = ctx;
  if (!chat || !message || !message.from || !message.entities) {
    return ctx.reply('nope');
  }
  const groupObj = await GroupModel.findOne({ telegramId: chat.id });

  if (!groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const member = groupObj.getMemberById(message.from.id);
  if (member === null) {
    ctx.reply('You are not in this group. Please use /newMember first!');
    return;
  }
  if (groupObj.state !== 'initial' && groupObj.state !== 'readyCheck') {
    ctx.reply(`Group state is ${groupObj.state}`);
    return;
  }
  const group = groupObj;

  const memberId = message.from.id;
  let amount: number;
  let description: string;
  let matches: RegExpMatchArray;
  let messageText;
  if (message.text) {
    messageText = message.text.substr(message.entities[0].length + 1);
  }
  // app.bot.telegram.deleteMessage(chat.id, message.message_id);

  if (!message.text || messageText == '') {
    let replyObj = await ctx.reply(`Please enter description.@${message.from.username}`, {
      reply_markup: { force_reply: true, selective: true }
    });

    description = await callbackHandler.getReply(chat.id, replyObj.message_id);
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    replyObj = await ctx.reply(`Please enter amount.@${message.from.username}`, {
      reply_markup: { force_reply: true, selective: true }
    });

    let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
    amount = parseFloat(amountText.replace(',', '.'));
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    while (!Number.isFinite(amount)) {
      const replyObj = await ctx.reply('Could not parse amount. Please enter valid amount!', {
        reply_markup: { force_reply: true, selective: true }
      });
      amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      amount = parseFloat(amountText.replace(',', '.'));
      app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    }
  } else {
    messageText = message.text.substr(message.entities[0].length + 1);
    let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);
    while (!matches) {
      const replyObj = await ctx.reply(`No Amount found! Reply With Amount please. @${message.from.username}`, {
        reply_markup: { force_reply: true, selective: true }
      });
      let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      matches = amountText.match(/\d+[.,]?\d*/);

    }
    amount = parseFloat(matches[0].replace(',', '.'));
    if (isNaN(amount)) {
      ctx.reply('Could not parse Amount!');
      return;
    }
    if (useForeign) {
      if (!group.currency) {
        return ctx.reply('Currency not set!');
      }
      amount /= group.currency;
    }
    description = messageText.replace(/(-\s?)?\d+[.,]?\d*/, '').trim();
    if (description === '') {
      description = 'no desc';
    }
  }
  const partialGroupMembers: Member[] = [];
  let done = false;
  while (!done && partialGroupMembers.length < group.members.length) {
    await new Promise<void>(async resolve => {
      // console.log(partialGroupMembers, 'a');
      const buttons = group.members.filter(member => {
        return !partialGroupMembers.find(partialGroupMember => partialGroupMember.id === member.id);
      }).map(member => {
        return [{
          text: member.name,
          clicked: async () => {
            partialGroupMembers.push(member);
            resolve();
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Done',
        clicked: async () => {
          done = true;
          resolve();
          return true;
        }
      }]);
      const keyboard = callbackHandler.getKeyboard(buttons);
      const memberList = partialGroupMembers.map(member => member.name).join(', ');
      await telegram.sendMessage(chat.id, `Current Group Members: ${memberList}. Please add group members:`,
        Markup.inlineKeyboard(keyboard)
      );
    });
  }

  if (!group.addEntry(memberId, description, amount, partialGroupMembers.map(member => member.id))) {
    ctx.reply('Error while adding!');
  }
};
