import {Composer, Markup} from 'telegraf';
import {app} from './app';
import {Member} from './member';
import { GroupModel} from './group';
import {v1 as uuidv1} from 'uuid';
import {callbackHandler} from './callback-handler';
import { TelegrafContext } from 'telegraf/typings/context';
export const addMiddleware = new Composer();
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
async function addOther({message, reply, chat, telegram}: TelegrafContext, useForeign: boolean) {
  if (!chat || !message || !message.text || !message.entities || !message.from) {
    return;
  }
  const memberId = message.from.id;
  const groupObj = await GroupModel.findOne({telegramId: chat.id});
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const messageText = message.text.substr(message.entities[0].length + 1);
  let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);
  while (!matches) {
    const replyObj = await reply(`No Amount found! Reply With Amount please.@${message.from.username}`, {
      reply_markup: {force_reply: true, selective: true}
    });
    let amount = await callbackHandler.getReply(chat.id, replyObj.message_id);
    matches = amount.match(/\d+[.,]?\d*/);
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
  }
  let amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    reply('Could not parse Amount!');
    return;
  }
  if (useForeign) {
    if (!groupObj.currency) {
      return reply('Currency not set!');
    }
    amount /= groupObj.currency;
  }
  let description = messageText.replace(/\d+[.,]?\d*/, '').trim();
  if (description === '') {
    description = 'no desc';
  }
  const {members} = groupObj;
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
    clicked: async () => {return true}
  }]);
  const keyboard = callbackHandler.getKeyboard(buttons);
  // keyboard.push([Markup.callbackButton('cancel', 'c')]);
  return reply(`Entry preview: "${description}: ${amount}".\nPlease select member.`, {
    reply_markup: Markup
    .inlineKeyboard(keyboard)
  });
};
async function add({reply, chat, message, replyWithMarkdown}: TelegrafContext, useForeign: boolean) {
  if (!chat || !message || !message.from || !message.entities) {
    return reply('nope');
  }
  const from = message.from;
  const groupObj = await GroupModel.findOne({telegramId: chat.id});

  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  let member = groupObj.getMemberById(message.from.id);
  if (!groupObj.members.find(member => member.id === from.id) && !groupObj.groupBannedUsers.find(member => member.id === from.id)) {
    await groupObj.addMember(message.from.first_name, message.from.id)
    member = groupObj.getMemberById(message.from.id);
  }
  if (!member) {
    return reply('User banned!');
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
    let replyObj = await reply(`Please enter description. @${message.from.username}`, {
      reply_markup: {force_reply: true, selective: true}
    });
    description = await callbackHandler.getReply(chat.id, replyObj.message_id);
    await app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
    replyObj = await reply(`Please enter amount. @${message.from.username}`, {
      reply_markup: {force_reply: true, selective: true}
    });

    let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
    amount = parseFloat(amountText.replace(',', '.'));
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    while (!Number.isFinite(amount)) {
      const replyObj = await reply(`Could not parse amount. Please enter valid amount! @${message.from.username}`, {
        reply_markup: {force_reply: true, selective: true}
      });

      amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      amount = parseFloat(amountText.replace(',', '.'));
      app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);
    }
  } else {
    messageText = message.text.substr(message.entities[0].length + 1);
    let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);

    while (!matches) {
      const replyObj = await reply(`No Amount found! Reply With Amount please.@${message.from.username}`, {
        reply_markup: {force_reply: true, selective: true}
      });
      let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      matches = amountText.match(/\d+[.,]?\d*/);

    }
    amount = parseFloat(matches[0].replace(',', '.'));
    if (isNaN(amount)) {
      reply('Could not parse Amount!');
      return;
    }
    description = messageText.replace(/(-\s?)?\d+[.,]?\d*/, '').trim();
    if (description === '') {
      description = 'no desc';
    }
  }
  if (useForeign) {
    if (!group.currency) {
      return reply('Currency not set!');
    }
    amount /= group.currency;
  }
  if (!group.addEntry(memberId, description, amount)) {
    reply('Error while adding!');
  }
};
async function addPartial({reply, chat, message, telegram}: TelegrafContext, useForeign: boolean) {
  if (!chat || !message || !message.from || !message.entities) {
    return reply('nope');
  }
  const groupObj = await GroupModel.findOne({telegramId: chat.id});

  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const member = groupObj.getMemberById(message.from.id);
  if (member === null) {
    reply('You are not in this group. Please use /newMember first!');
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
    let replyObj = await reply(`Please enter description.@${message.from.username}`, {
      reply_markup: {force_reply: true, selective: true}
    });

    description = await callbackHandler.getReply(chat.id, replyObj.message_id);
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    replyObj = await reply(`Please enter amount.@${message.from.username}`, {
      reply_markup: {force_reply: true, selective: true}
    });

    let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
    amount = parseFloat(amountText.replace(',', '.'));
    app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    while (!Number.isFinite(amount)) {
      const replyObj = await reply('Could not parse amount. Please enter valid amount!', {
        reply_markup: {force_reply: true, selective: true}
      });
      amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      amount = parseFloat(amountText.replace(',', '.'));
      app.bot.telegram.deleteMessage(replyObj.chat.id, replyObj.message_id);

    }
  } else {
    messageText = message.text.substr(message.entities[0].length + 1);
    let matches = messageText.match(/(-\s?)?\d+[.,]?\d*/);
    while (!matches) {
      const replyObj = await reply(`No Amount found! Reply With Amount please. @${message.from.username}`, {
        reply_markup: {force_reply: true, selective: true}
      });
      let amountText = await callbackHandler.getReply(chat.id, replyObj.message_id);
      matches = amountText.match(/\d+[.,]?\d*/);

    }
    amount = parseFloat(matches[0].replace(',', '.'));
    if (isNaN(amount)) {
      reply('Could not parse Amount!');
      return;
    }
    if (useForeign) {
      if (!group.currency) {
        return reply('Currency not set!');
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
    await new Promise(async resolve => {
      console.log(partialGroupMembers, 'a');
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
      await telegram.sendMessage(chat.id, `Current Group Members: ${memberList}. Please add group members:`, {
        reply_markup:
          Markup.inlineKeyboard(keyboard)
        // .oneTime()
        // .resize()
        // .extra()
      });
    });
  }

  if (!group.addEntry(memberId, description, amount, partialGroupMembers.map(member => member.id))) {
    reply('Error while adding!');
  }
};
