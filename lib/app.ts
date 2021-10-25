import { Context, Telegraf } from 'telegraf';
import { Markup, Middleware } from 'telegraf';
import { connect } from 'mongoose';
import { addMiddleware } from './add';
import * as express from 'express';
import { callbackHandler, IButton } from './callback-handler';
import { PromiseType } from 'utility-types';
connect('mongodb://mongo/urlaubsbot', { useNewUrlParser: true });
const AsciiTable = require('ascii-table');
import { prop, post, DocumentType, arrayProp, pre, getModelForClass } from '@typegoose/typegoose';

import { web } from './web';
import { Group, GroupModel } from './group';
import { PaypalMappingModel } from './paypalMapping';
import { runInThisContext } from 'vm';
import { ITransaction } from './interfaces';
import { tr } from 'date-fns/locale';
// import { Sheet } from'./sheet';
if (typeof process.env.TOKEN !== 'string') {
  throw new Error('Token not set!');
}
class App {
  bot = new Telegraf(process.env.TOKEN as string);
  commands: { command: string, description: string }[] = [
    { command: 'add', description: 'Adds amount. Please only input one number after, because it will be used as amount.' },
    { command: 'addforeign', description: 'Adds amount in foreign currency. Will be divided by currency value. Orginal amount will be discarded.' },
    { command: 'addother', description: 'Adds amount to different member.' },
    { command: 'addotherforeign', description: 'Adds amount to different member in foreign currency.' },
    { command: 'addpartial', description: 'Add amount only to certain group members.' },
    { command: 'addpartialforeign', description: 'Add amount only to certain group members in foreign currency.' },
  ];
  addCommand(command: string, description: string, middleware0: Parameters<this['bot']['command']>[1], ...middlewares: Parameters<this['bot']['command']>[2][]) {
    this.commands.push({ command, description });
    this.bot.command(command, middleware0, ...middlewares);
  }
  express: express.Application;

  url: string;
  constructor() {
    let webHook = false;
    let port: number;
    process.chdir(__dirname);
    port = parseInt(process.env.PORT ?? '3000');
    this.url = process.env.HOST ?? `http://localhost:${port}`;
    this.bot.telegram.getMe().then(botInfo => {
      // console.log(botInfo);
      // this.bot.options.username = botInfo.username;
      this.bot.telegram.setMyCommands(this.commands);


    });
    this.express = express();
    this.express.set('view engine', 'ejs');
    this.express.set('views', '../views');

    this.express.use('/client', express.static('../client'));

    this.express.get('/', (_req, res) => {
      res.send('Hello World!');
    });

    if (webHook) {
      this.express.use(this.bot.webhookCallback('/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4'));
      this.bot.telegram.setWebhook(this.url + '/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
      this.bot.telegram.webhookReply = false
      this.bot.launch({
        webhook: {
          hookPath: this.url + '/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4'
        }
      });
      this.bot.telegram.setWebhook('');

    } else {
      this.bot.launch();
      console.log('starting Polling');
      this.bot.telegram.setWebhook('');
    }
    this.bot.use((addMiddleware as unknown) as Middleware<any>);
    this.express.listen(port, () => {
      console.log('express listening on port', port);
    });
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use('/font-awesome', express.static('./client/node_modules/@fortawesome/fontawesome-free'));
    this.express.use('/group', web.router);
    // this.bot.use((ctx, next) => {
    //   ctx.groupObj = GroupModel.find({telegramId: ctx.chat.id});
    //   return next(ctx).then(async () => {
    //     await ctx.groupObj.save();
    //   });
    // });
    this.bot.on('message', async (ctx, next) => {
      // reply('mesesage');
      // console.log(ctx);
      const { chat, message } = ctx;
      if (chat?.type !== 'group') {
        return next();
      }
      if (!chat || !chat.id || !message || !message.from) {
        ctx.reply('WTF');
        return;
      }
      const from = message.from;
      let groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        groupObj = new GroupModel();
        groupObj.name = chat.title || '';
        groupObj.telegramId = chat.id;
        await groupObj.save();
      }
      if (from.is_bot === false && !groupObj.members.find(member => member.id === from.id) && !groupObj.groupBannedUsers.find(member => member.id === from.id)) {
        await groupObj.addMember(message.from.first_name, message.from.id)
      }
      const chatDetails = await this.bot.telegram.getChat(groupObj.telegramId);
      const botInfo = await this.bot.telegram.getMe();
      let pinned = false;
      if (chatDetails.pinned_message?.from?.id === botInfo.id) {
        pinned = true;
      }

      if (!pinned) {
        const groupMemberInfo = await this.bot.telegram.getChatMember(groupObj.telegramId, botInfo.id);
        if (groupMemberInfo.status !== 'administrator' || groupMemberInfo.can_pin_messages !== true) {
          if (groupObj.pinningRightsCooldown === undefined || new Date().getDate() - groupObj.pinningRightsCooldown.getDate() > 1000 * 60 * 60 * 24) {
            const message = await this.bot.telegram.sendMessage(groupObj.telegramId, 'Please give Pinning Rights.');
            groupObj.pinningRightsCooldown = new Date();
            await groupObj.save();
          }

        } else {
          const message = await this.bot.telegram.sendMessage(groupObj.telegramId, `<a href="${this.url}/client/index.html#${groupObj.id}">Inforino</a>`, { parse_mode: 'HTML' });
          await this.bot.telegram.pinChatMessage(groupObj.telegramId, message.message_id);
        }
      }
      if (next) {
        next();
      }
    });
    this.bot.on('group_chat_created', async (ctx) => {
      const { chat, message } = ctx;
      if (!chat || !message || !message.from) {
        return;
      }
      let groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        groupObj = new GroupModel();
        groupObj.name = 'title' in chat ? chat.title : '';
        groupObj.telegramId = chat.id;
        await groupObj.save();
        ctx.reply('Neue Gruppe angelegt: ' + groupObj.name);
      }
      for (const member of ((message as any).new_chat_members ?? [])) {
        if (member.is_bot === false) {
          groupObj.addMember(member.first_name, member.id);
        }
      }

      groupObj.addMember(message.from.first_name, message.from.id);
    });
    this.bot.on('new_chat_title', async (ctx) => {
      const { chat } = ctx;
      if ("title" in chat) {
        const groupObj = await GroupModel.findOne({ telegramId: chat.id });
        if (groupObj) {
          groupObj.name = chat.title;
          await groupObj.save();
          await ctx.reply(`Changed Group name to ${groupObj.name}`);
        }
      }
    })
    this.bot.on('new_chat_members', async (ctx) => {
      const { reply, message, chat } = ctx;
      if (!chat || !message || !message.from) {
        console.log('WTF');
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }
      // reply(JSON.stringify(message.new_chat_members));
      for (const member of (message.new_chat_members || [])) {
        if (member.is_bot === false && !groupObj.members.find(memberSearch => member.id === memberSearch.id) && !groupObj.groupBannedUsers.find(memberSearch => member.id === memberSearch.id)) {
          groupObj.addMember(member.first_name, member.id);
        }
      }
    });
    this.addCommand('members', 'list all members', async ctx => {
      if (!ctx.chat || !ctx.chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: ctx.chat.id });
      if (groupObj) {
        if (groupObj.members.length === 0) {
          ctx.reply('GroupModel empty.');
          return;
        }
        const str = 'Members: ' + groupObj.members.map(member => member.name).join(', ');
        ctx.reply(str);
      } else {
        ctx.reply('Not in group / none initialized group');
      }
    });
    this.addCommand('membersdetail', 'list all members with id', async ctx => {
      if (!ctx.chat || !ctx.chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: ctx.chat.id });
      if (groupObj) {
        if (groupObj.members.length === 0) {
          ctx.reply('GroupModel empty.');
          return;
        }
        const str = 'Members: ' + groupObj.members.map(member => `${member.name} (${member.id})`).join(', ');
        ctx.reply(str);
      } else {
        ctx.reply('Not in group / none initialized group');
      }
    });
    this.addCommand('newmembernotelegram', 'adds a member who has no telegram', async (ctx) => {
      const { message, reply, chat } = ctx;
      if (!chat || !chat.id || !message || !message.text || !message.entities) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }
      // Object.keys(ctx.message).forEach(key => {
      //   console.log(typeof ctx.message[key], key);
      //   if (typeof ctx.message[key] === 'object') {
      //     console.log(ctx.message[key]);
      //   }
      // });
      // console.log(message);
      const memberName = message.text.substr(message.entities[0].length + 1);
      if (memberName === '') {
        return ctx.reply('No Name given!');
      }
      let memberId = 0;
      for (let i = 0; i < memberName.length; i++) {
        memberId -= memberName.charCodeAt(i);
      }
      if (!await groupObj.addMember(memberName, memberId)) {
        ctx.reply('You are already in group!');
      }
    });
    this.addCommand('done', 'Set the Group to done directly', async ctx => {
      const { chat } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      groupObj.state = 'done';
      await groupObj.save();
      ctx.reply('Group = Done!');
    })
    this.addCommand('readycheck', 'Initiates Ready Check', async ctx => {
      const { chat } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      if (groupObj.state === 'transactionCheck') {
        return this.runTransactionCheck(groupObj);
      }
      if (groupObj.state !== 'initial' && groupObj.state !== 'readyCheck') {
        return ctx.reply(`Group already in state ${groupObj.state}!`);

      }
      this.runReadyCheck(groupObj);
      // keyboard.push([Markup.callbackButton('cancel', 'c')]);


    });
    this.addCommand('rollback', 'Rollbackes Ready Check', async ctx => {
      const { chat } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      if (groupObj.state === 'initial' || groupObj.state === 'readyCheck') {
        return ctx.reply(`Group already in state ${groupObj.state}!`);

      }
      return ctx.reply(`Confirm rollback Readycheck...\n`,
        Markup
          .inlineKeyboard(callbackHandler.getKeyboard([[{
            text: '💣 Confirm',
            clicked: async (user) => {
              groupObj.state = 'initial';
              for (const member of groupObj.members) {
                member.readyCheckConfirmed = false;
              }
              groupObj.transactions = null;
              await groupObj.save();
              return true;
            }
          }]])));
    });
    this.addCommand('groupinfo', 'gets Link to fancy group view', async (ctx) => {
      const { chat } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      ctx.replyWithHTML(`<a href="${this.url}/client/index.html#${groupObj.id}">Inforino</a>`); // eslint-disable-line camelcase
    });

    this.addCommand('summary', 'get summary.', async (ctx) => {
      const { chat, reply, replyWithHTML, replyWithPhoto } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }
      const table = await groupObj.getSummaryTable();
      ctx.replyWithHTML('<code>' + table + '</code>');
    });
    this.addCommand('transactions', 'Get Transactions', async (ctx) => {
      const { chat, reply, replyWithHTML } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }
      // console.log(`<b>Transactions</b>\n` + (await groupObj.evaluate()).transactions.map(transaction => `${transaction.from} -> ${transaction.to}: ${Math.round(transaction.amount * 100) / 100} ${transaction.paypalLink ? `<a href="${transaction.paypalLink}">paypal</a>` : ''}`).join('\n'));
      ctx.replyWithHTML(`<b>Transactions</b>\n` + (await groupObj.evaluate()).transactions.map(transaction => `${transaction.from} -> ${transaction.to}: ${Math.round(transaction.amount * 100) / 100} ${transaction.paypalLink ? `<a href="${transaction.paypalLink}">paypal</a>` : ''}`).join('\n'));
      // const table = AsciiTable.factory({
      //     title: 'Transactions'
      //   , heading: [ 'from', 'to', 'amount', 'paypalLink' ]
      //   , rows: (await groupObj.evaluate()).transactions.map(transaction => [transaction.from, transaction.to, Math.round(transaction.amount * 100) / 100, transaction.paypalLink ? `</code><a href="${transaction.paypalLink}">paypal</a><code>` : ''])
      // })
      // replyWithHTML('<code>' + table.toString() + '</code>');
    });
    this.addCommand('setpaypal', 'Set Paypal Link', async (ctx) => {
      const { chat, reply, message } = ctx;
      if (!chat || !chat.id || !message || !message.text || !message.from) {
        return;
      }
      const paypalLinkMatch = message.text.match(/paypal.me\/([a-z0-9]+)/i);
      if (!paypalLinkMatch) {
        return ctx.reply('No Paypal Link found' + message.text);
      }
      const paypalLink = 'https://www.paypal.me/' + paypalLinkMatch[1];
      const mapping = await PaypalMappingModel.findOne({ telegramId: message.from.id });
      if (!mapping) {
        const doc = new PaypalMappingModel({ telegramId: message.from.id, link: paypalLink });
        await doc.save();
        return ctx.reply('Paypal Link set to: ' + doc.link);
      } else {
        mapping.link = paypalLink;
        await mapping.save();
        return ctx.reply('Paypal Link set to: ' + mapping.link);
      }
    })
    this.addCommand('setcurrency', 'Sets exchange rate for foreign currrency to be used. All foreign amounts will be divide by this value.', async (ctx) => {
      const { message, reply, chat } = ctx;
      if (!chat || !chat.id || !message || !message.text || !message.entities) {
        return;
      }

      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      const messageText = message.text.substr(message.entities[0].length + 1);
      const currency = parseFloat(messageText.replace(',', '.'));
      if (isNaN(currency)) {
        return ctx.reply('Could not parse Currency!');
      }
      groupObj.currency = currency;
      await groupObj.save();
      ctx.reply(`Currency set to ${currency}.`);
    });
    this.addCommand('getcurrency', 'Gets exchange rate', async (ctx) => {
      const { reply, chat } = ctx;
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        return ctx.reply('Not in group / none initialized group');
      }
      if (groupObj.currency === null) {
        return ctx.reply('No Currency set!');
      }
      ctx.reply(`Currency is ${groupObj.currency}.`);
    });

    this.addCommand('memberinfo', 'get info about you', async (ctx) => {
      const { chat, reply, replyWithHTML, message } = ctx;
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }
      const group = groupObj;
      ctx.replyWithHTML(await group.getMemberinfo(message.from.id));
    });
    this.addCommand('remove', 'Remove Entry', async (ctx) => {
      const { reply, message, chat } = ctx;
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const memberId = message.from.id;
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return ctx.reply('Did not find user!');
      }
      const buttons = member.entries.map(entry => {
        return [{
          text: entry.description + ': ' + entry.amount,
          clicked: async () => {
            await groupObj.removeEntry(memberId, entry.uuid);
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true; }
      }]);

      const keyboard = callbackHandler.getKeyboard(buttons);
      return ctx.reply('Please select entry to delete:',
        Markup.inlineKeyboard(keyboard)
      );
    });
    this.addCommand('kick', 'Kick User', async (ctx) => {
      const { reply, chat } = ctx;
      if (!chat) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }

      const buttons = groupObj.members.map((member, index) => {
        return [{
          text: member.name,
          clicked: async () => {
            if (member.entries.length > 0) {
              await ctx.reply(`${member.name} has entries. Can not kick user with entries.`);
              return true;
            }
            groupObj.members.splice(index, 1);
            groupObj.groupBannedUsers.push({
              id: member.id,
              name: member.name
            });
            await groupObj.save();
            await ctx.reply(`${member.name} kicked!`);
            return true;
          }
        }]
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true; }
      }]);
      const keyboard = callbackHandler.getKeyboard(buttons);
      return ctx.reply('Please select member to kick:',
        Markup.inlineKeyboard(keyboard)
      );
    });
    this.addCommand('editdescription', 'Edit Description of entry', async (ctx) => {
      const { reply, message, chat } = ctx;
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return ctx.reply('Did not find user!');
      }
      const buttons = member.entries.map(entry => {
        return [{
          text: entry.description + ': ' + entry.amount,
          clicked: async () => {
            const replyObj = await ctx.reply('Please enter new Description.', {
              reply_markup: { force_reply: true, selective: true }
            });
            const oldDescription = entry.description;
            entry.description = await callbackHandler.getReply(chat.id, replyObj.message_id);
            await groupObj.save();
            await ctx.reply(`Changed Entry: ${oldDescription} ->  ${entry.description}: ${entry.amount}`);
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true; }
      }]);
      const keyboard = callbackHandler.getKeyboard(buttons);
      return ctx.reply('Please select entry to edit description of:',
        Markup.inlineKeyboard(keyboard)
      );
    });
    this.addCommand('editamount', 'Edit Amount of entry', async (ctx) => {
      const { reply, message, chat } = ctx;
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        ctx.reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return ctx.reply('Did not find user!');
      }
      const buttons: IButton[][] = member.entries.map(entry => {
        return [{
          text: entry.description + ': ' + entry.amount,
          clicked: async () => {
            const replyObj = await ctx.reply('Please enter new Amount.', {
              reply_markup: { force_reply: true, selective: true }
            });
            const oldAmount = entry.amount;
            let newAmount = parseFloat((await callbackHandler.getReply(chat.id, replyObj.message_id)).replace(',', '.'));
            while (!Number.isFinite(newAmount)) {
              const replyObj = await ctx.reply('Could not parse amount! Please retry.', {
                reply_markup: { force_reply: true, selective: true }
              });
              newAmount = parseFloat((await callbackHandler.getReply(chat.id, replyObj.message_id)).replace(',', '.'));

            }
            entry.amount = newAmount;
            await groupObj.save();
            await ctx.reply(`Changed Entry: ${entry.description}: ${oldAmount} -> ${entry.amount}`);
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true }
      }]);

      const keyboard = callbackHandler.getKeyboard(buttons);
      return ctx.reply('Please select entry to edit amount of:',
        Markup.inlineKeyboard(keyboard)
      );
    });

    this.bot.action(/./, ctx => {

      return callbackHandler.handle(ctx);
    });
    this.bot.on('message', (ctx, next) => {
      callbackHandler.handleMessage(ctx);
      next();
    });
    this.addCommand('groups', 'Get overview over groups (works only in private chat)', async (ctx, next) => {
      const { chat, reply, replyWithHTML } = ctx;
      if (chat?.type !== 'private') {
        return next();
      }
      const groups = await GroupModel.find({ 'members.id': chat.id });
      ctx.reply("Listing all groups where you and another person is member...");
      for (const group of groups) {
        if (group.members.length > 1 && group.state !== 'done') {
          const table = await group.getSummaryTable();
          ctx.replyWithHTML(`<code>Group '${group.name}'\n${table} </code>`);
        }
      }
    })

    this.addCommand('help', 'list all commands', (ctx) => {
      let str = '';
      for (const { command, description } of this.commands) {
        str += `/${command} - ${description}\n`;
      }
      const help = str.split('\n');
      help.sort();
      ctx.reply(help.join('\n'));
    });
  }
  async runReadyCheck(groupObj: DocumentType<Group>) {
    groupObj.state = 'readyCheck';
    await groupObj.save();
    let message: PromiseType<ReturnType<typeof this.bot.telegram.sendMessage>>;
    while (groupObj.members.reduce((prev, member) => prev && member.readyCheckConfirmed, true) === false) {
      await new Promise<void>(async resolve => {
        const keyboard = callbackHandler.getKeyboard(
          groupObj.members.map(member => [({
            text: `${member.name} ${member.readyCheckConfirmed ? `✅` : `🔳`}`,
            clicked: async (user) => {
              member.readyCheckConfirmed = !member.readyCheckConfirmed;
              await groupObj.save();
              resolve();
              return false;
            }
          })]));
        if (message) {
          const response = await this.bot.telegram.editMessageReplyMarkup(message.chat.id, message.message_id, undefined, { inline_keyboard: keyboard });
          if (!response) {
            message = await this.bot.telegram.sendMessage(groupObj.telegramId, `Ready Check. Please confirm you added everything...\n`,
              Markup
                .inlineKeyboard(keyboard)
            );
          }
        } else {
          message = await this.bot.telegram.sendMessage(groupObj.telegramId, `Ready Check. Please confirm you added everything...\n`,
            Markup
              .inlineKeyboard(keyboard)
          );

        }

      })

    }
    this.runTransactionCheck(groupObj);

  }
  async runTransactionCheck(groupObj: DocumentType<Group>) {
    groupObj.state = 'transactionCheck';
    const evaluation = await groupObj.evaluate();
    groupObj.transactions = evaluation.transactions;
    await groupObj.save();
    let message: PromiseType<ReturnType<typeof this.bot.telegram.sendMessage>>;
    function transactionFormatter(transaction: ITransaction) {
      return `${transaction.from} -> ${transaction.to} ${Math.round(transaction.amount * 100) / 100} ${transaction.confirmed ? `✅` : `🔳`}`;
    }
    while ((groupObj.transactions as ITransaction[])?.reduce((prev, trans) => prev && trans.confirmed, true) === false || true) {
      await new Promise<void>(async resolve => {
        const keyboard = callbackHandler.getKeyboard((groupObj.transactions as ITransaction[]).map(transaction => [({
          text: transactionFormatter(transaction),
          clicked: async () => {
            transaction.confirmed = !transaction.confirmed;
            await groupObj.save();
            resolve();
            return false
          }
        })]));
        const messageText = `Transaction Check. Please confirm Transactions...\n` +
          (groupObj.transactions as ITransaction[]).map(transaction => `${transactionFormatter(transaction)} ${transaction.paypalLink ? `<a href="${transaction.paypalLink}">paypal</a>` : ''} `).join('\n');
        if (message) {
          try {
            const response = await this.bot.telegram.editMessageReplyMarkup(message.chat.id, message.message_id, undefined, { inline_keyboard: keyboard });
            if (!response) {
              message = await this.bot.telegram.sendMessage(groupObj.telegramId, messageText,
                Markup.inlineKeyboard(keyboard)
              );
            }
          } catch(e) {
            message = await this.bot.telegram.sendMessage(groupObj.telegramId, messageText,
              Markup .inlineKeyboard(keyboard)
            );
          }
        } else {
          message = await this.bot.telegram.sendMessage(groupObj.telegramId, messageText,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: keyboard,
              }
            }
          );

        }

      });
    }
    groupObj.state = 'done';
    await groupObj.save();
    this.bot.telegram.sendMessage(groupObj.telegramId, `Group = done 🎆🎆🎆`);
  }
}

export const app = new App();
