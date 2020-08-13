import Telegraf from 'telegraf';
import { Markup, Middleware } from 'telegraf';
import { connect } from 'mongoose';
import { addMiddleware } from './add';
import * as express from 'express';
import { callbackHandler, IButton } from './callback-handler';
connect('mongodb://mongo/urlaubsbot', { useNewUrlParser: true });
const AsciiTable = require('ascii-table');

import { web } from './web';
import { GroupModel } from './group';
import { PaypalMappingModel } from './paypalMapping';
// import { Sheet } from'./sheet';
if (typeof process.env.TOKEN !== 'string') {
  throw new Error('Token not set!');
}
class App {
  express: express.Application;

  bot = new Telegraf(process.env.TOKEN as string);
  url: string;
  constructor() {
    let webHook = false;
    let port: number;
    process.chdir(__dirname);
    // if (process.env.BOT_ENV === 'MACBOOK') {
    //   port = 61237;
    //   this.bot = new Telegraf('***REMOVED***');
    //   this.url = 'http://127.0.0.1:61237/';
    // } else {
    //   port = 61239;
    //   this.bot = new Telegraf('***REMOVED***');
    //   this.url = 'https://anton-schulte.de/urlaub2/';
    //   webHook = true;
    // }
    port = parseInt(process.env.PORT ?? '3000');
    this.url = `http://127.0.0.1:${port}/`;
    this.bot.telegram.getMe().then(botInfo => {
      console.log(botInfo);
      (this.bot as any).options.username = botInfo.username;
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
      this.bot.telegram.setWebhook(this.url + 'AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
      this.bot.telegram.webhookReply = false
    } else {
      console.log('starting Polling');
      // this.bot.telegram.setWebhook('');
      this.bot.startPolling();
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
    this.bot.on('message', async ({ chat, reply, message }, next) => {
      // reply('mesesage');
      if (!chat || !chat.id || !message || !message.from) {
        reply('WTF');
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
      if (!groupObj.members.find(member => member.id === from.id) && !groupObj.groupBannedUsers.find(member => member.id === from.id)) {
        await groupObj.addMember(message.from.first_name, message.from.id)
      }

      if (next) {
        next();
      }
    });
    this.bot.on('group_chat_created', async ({ reply, chat, message }) => {
      if (!chat || !message || !message.from) {
        return;
      }
      let groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        groupObj = new GroupModel();
        groupObj.name = chat.title || '';
        groupObj.telegramId = chat.id;
        await groupObj.save();
        reply('Neue Gruppe angelegt: ' + groupObj.name);
      }
      for (const member of (message.new_chat_members || [])) {
        if (member.is_bot === false) {
          groupObj.addMember(member.first_name, member.id);
        }
      }

      groupObj.addMember(message.from.first_name, message.from.id);
    });
    this.bot.on('new_chat_title', async ({ chat, reply }) => {
      if (chat && chat.title) {
        const groupObj = await GroupModel.findOne({ telegramId: chat.id });
        if (groupObj) {
          groupObj.name = chat.title;
          await groupObj.save();
          await reply(`Changed Group name to ${groupObj.name}`);
        }
      }
      console.log()
    })
    this.bot.on('new_chat_members', async ({ reply, message, chat }) => {
      if (!chat || !message || !message.from) {
        console.log('WTF');
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }
      // reply(JSON.stringify(message.new_chat_members));
      for (const member of (message.new_chat_members || [])) {
        if (member.is_bot === false && !groupObj.members.find(memberSearch => member.id === memberSearch.id) && !groupObj.groupBannedUsers.find(memberSearch => member.id === memberSearch.id)) {
          groupObj.addMember(member.first_name, member.id);
        }
      }
    });
    this.bot.command('initializegroup', async ctx => {
      if (!ctx.chat) {
        return;
      }
      if (await GroupModel.findOne({ telegramId: ctx.chat.id })) {
        ctx.reply('Group already initialized');
        return;
      }

      const group = new GroupModel();
      group.name = ctx.chat.title || '';
      group.telegramId = ctx.chat.id;
      await group.save();
      ctx.reply('GroupModel initialized');
    });
    this.bot.command('members', async ctx => {
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
    this.bot.command('membersdetail', async ctx => {
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
    this.bot.command('test', async ({ message, reply }) => {
      if (!message || !message.text) {
        return;
      }
      for (const entity of (message.entities || [])) {
        if (entity.type === 'mention') {
          reply(message.text.substr(entity.offset, entity.length));
        }
      }
      console.log(message.entities);
      reply(JSON.stringify(message));
    });

    this.bot.command('newmember', async ({ chat, reply, message }) => {
      return reply('Command deprecated. Members get added on any message');
    });
    this.bot.command('newmembernotelegram', async ({ message, reply, chat }) => {
      if (!chat || !chat.id || !message || !message.text || !message.entities) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        reply('Not in group / none initialized group');
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
        return reply('No Name given!');
      }
      let memberId = 0;
      for (let i = 0; i < memberName.length; i++) {
        memberId -= memberName.charCodeAt(i);
      }
      if (!await groupObj.addMember(memberName, memberId)) {
        reply('You are already in group!');
      }
    });
    this.bot.command('groupinfo', async ({ reply, chat, replyWithHTML }) => {
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      console.log('c');

      if (!groupObj) {
        return reply('Not in group / none initialized group');
      }
      replyWithHTML(`<a href="${this.url}client/index.html#${groupObj.id}">Inforino</a>`); // eslint-disable-line camelcase
    });

    this.bot.command('summary', async ({ chat, reply, replyWithHTML, replyWithPhoto }) => {
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }
      const table = await groupObj.getSummaryTable();
      replyWithHTML('<code>' + table + '</code>');
    });
    this.bot.command('transactions', async ({ chat, reply, replyWithHTML }) => {
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }
      console.log(`<b>Transactions</b>\n` + (await groupObj.evaluate()).transactions.map(transaction => `${transaction.from} -> ${transaction.to}: ${Math.round(transaction.amount * 100) / 100} ${transaction.paypalLink ? `<a href="${transaction.paypalLink}">paypal</a>` : ''}`).join('\n'));
      replyWithHTML(`<b>Transactions</b>\n` + (await groupObj.evaluate()).transactions.map(transaction => `${transaction.from} -> ${transaction.to}: ${Math.round(transaction.amount * 100) / 100} ${transaction.paypalLink ? `<a href="${transaction.paypalLink}">paypal</a>` : ''}`).join('\n'));
      // const table = AsciiTable.factory({
      //     title: 'Transactions'
      //   , heading: [ 'from', 'to', 'amount', 'paypalLink' ]
      //   , rows: (await groupObj.evaluate()).transactions.map(transaction => [transaction.from, transaction.to, Math.round(transaction.amount * 100) / 100, transaction.paypalLink ? `</code><a href="${transaction.paypalLink}">paypal</a><code>` : ''])
      // })
      // replyWithHTML('<code>' + table.toString() + '</code>');
    });
    this.bot.command('setpaypal', async ({ chat, reply, message }) => {
      if (!chat || !chat.id || !message || !message.text || !message.from) {
        return;
      }
      const paypalLinkMatch = message.text.match(/paypal.me\/([a-z0-9]+)/i);
      if (!paypalLinkMatch) {
        return reply('No Paypal Link found' + message.text);
      }
      const paypalLink = 'https://www.paypal.me/' + paypalLinkMatch[1];
      const mapping = await PaypalMappingModel.findOne({ telegramId: message.from.id });
      if (!mapping) {
        const doc = new PaypalMappingModel({ telegramId: message.from.id, link: paypalLink });
        await doc.save();
        return reply('Paypal Link set to: ' + doc.link);
      } else {
        mapping.link = paypalLink;
        await mapping.save();
        return reply('Paypal Link set to: ' + mapping.link);
      }
    })
    this.bot.command('setcurrency', async ({ message, reply, chat }) => {
      if (!chat || !chat.id || !message || !message.text || !message.entities) {
        return;
      }

      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      if (!groupObj) {
        return reply('Not in group / none initialized group');
      }
      const messageText = message.text.substr(message.entities[0].length + 1);
      const currency = parseFloat(messageText.replace(',', '.'));
      if (isNaN(currency)) {
        return reply('Could not parse Currency!');
      }
      groupObj.currency = currency;
      await groupObj.save();
      reply(`Currency set to ${currency}.`);
    });
    this.bot.command('getcurrency', async ({ reply, chat }) => {
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        return reply('Not in group / none initialized group');
      }
      if (groupObj.currency === null) {
        return reply('No Currency set!');
      }
      reply(`Currency is ${groupObj.currency}.`);
    });

    this.bot.command('memberinfo', async ({ chat, reply, replyWithHTML, message }) => {
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }
      const group = groupObj;
      replyWithHTML(await group.getMemberinfo(message.from.id));
    });
    this.bot.command('remove', async ({ reply, message, chat }) => {
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const memberId = message.from.id;
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return reply('Did not find user!');
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
      return reply('Please select entry to delete:', {
        reply_markup:
          Markup.inlineKeyboard(keyboard)
        // .oneTime()
        // .resize()
        // .extra()
      });
    });
    this.bot.command('kick', async ({ reply, chat }) => {
      if (!chat) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }

      const buttons = groupObj.members.map((member, index) => {
        return [{
          text: member.name,
          clicked: async () => {
            if (member.entries.length > 0) {
              await reply(`${member.name} has entries. Can not kick user with entries.`);
              return true;
            }
            groupObj.members.splice(index, 1);
            groupObj.groupBannedUsers.push({
              id: member.id,
              name: member.name
            });
            await groupObj.save();
            await reply(`${member.name} kicked!`);
            return true;
          }
        }]
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true; }
      }]);
      const keyboard = callbackHandler.getKeyboard(buttons);
      return reply('Please select member to kick:', {
        reply_markup:
          Markup.inlineKeyboard(keyboard)
        // .oneTime()
        // .resize()
        // .extra()
      });
    });
    this.bot.command('editdescription', async ({ reply, message, chat }) => {
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return reply('Did not find user!');
      }
      const buttons = member.entries.map(entry => {
        return [{
          text: entry.description + ': ' + entry.amount,
          clicked: async () => {
            const replyObj = await reply('Please enter new Description.', {
              reply_markup: { force_reply: true, selective: true }
            });
            const oldDescription = entry.description;
            entry.description = await callbackHandler.getReply(chat.id, replyObj.message_id);
            await groupObj.save();
            await reply(`Changed Entry: ${oldDescription} ->  ${entry.description}: ${entry.amount}`);
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true; }
      }]);
      const keyboard = callbackHandler.getKeyboard(buttons);
      return reply('Please select entry to edit description of:', {
        reply_markup:
          Markup.inlineKeyboard(keyboard)
        // .oneTime()
        // .resize()
        // .extra()
      });
    });
    this.bot.command('numbers', ({ reply, chat, telegram }) => {
      (async () => {
        if (!chat) {
          return;
        }
        // return;
        let done = false;
        let addNumber = '';
        let message_id: number;
        while (!done) {
          await new Promise(async resolve => {
            console.log(addNumber, 'a');
            let numbers = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [0, '.']];
            const buttons: IButton[][] = numbers.map(numbersRow => numbersRow.map(number => {
              return {
                text: String(number),
                clicked: async () => {
                  addNumber += String(number);
                  console.log('added', number);
                  resolve();
                  return false;
                }
              };
            }))
            buttons.push([{
              text: 'Done',
              clicked: async () => {
                done = true;
                resolve();
                return true;
              }
            }, {
              text: 'Del',
              clicked: async () => {
                addNumber = addNumber.substr(0, addNumber.length - 1);
                resolve();
                return false;
              }
            }]);
            const keyboard = callbackHandler.getKeyboard(buttons);
            // if (message_id) {
            //   // await telegram.editMessageReplyMarkup(chat.id, message_id, undefined, {
            //   //   reply_markup:
            //   //     Markup.inlineKeyboard(keyboard)
            //   // } as any);
            //
            // } else {
            const resp = await telegram.sendMessage(chat.id, `Add numbers: current input ${addNumber}`, {
              reply_markup:
                Markup.inlineKeyboard(keyboard)
            });
            message_id = resp.message_id;

            // }
          });
        }
        reply('Number: ' + addNumber);
      })();
    });
    this.bot.command('editamount', async ({ reply, message, chat }) => {
      if (!chat || !chat.id || !message || !message.from) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }

      const member = groupObj.getMemberById(message.from.id);
      if (!member) {
        return reply('Did not find user!');
      }
      const buttons: IButton[][] = member.entries.map(entry => {
        return [{
          text: entry.description + ': ' + entry.amount,
          clicked: async () => {
            const replyObj = await reply('Please enter new Amount.', {
              reply_markup: { force_reply: true, selective: true }
            });
            const oldAmount = entry.amount;
            let newAmount = parseFloat((await callbackHandler.getReply(chat.id, replyObj.message_id)).replace(',', '.'));
            while (!Number.isFinite(newAmount)) {
              const replyObj = await reply('Could not parse amount! Please retry.', {
                reply_markup: { force_reply: true, selective: true }
              });
              newAmount = parseFloat((await callbackHandler.getReply(chat.id, replyObj.message_id)).replace(',', '.'));

            }
            entry.amount = newAmount;
            await groupObj.save();
            await reply(`Changed Entry: ${entry.description}: ${oldAmount} -> ${entry.amount}`);
            return true;
          }
        }];
      });
      buttons.push([{
        text: 'Cancel',
        clicked: async () => { return true }
      }]);

      const keyboard = callbackHandler.getKeyboard(buttons);
      return reply('Please select entry to edit amount of:', {
        reply_markup:
          Markup.inlineKeyboard(keyboard)
        // .oneTime()
        // .resize()
        // .extra()
      });
    });

    (this.bot as any).action(/./, (ctx: any) => {
      return callbackHandler.handle(ctx);
    });
    this.bot.on('message', (ctx) => {
      callbackHandler.handleMessage(ctx);
    });
    this.bot.command('help', ({ reply }) => {
      const str = `/initializegroup - initialize group, so bot knows it;
    /newmember - adds yourself to group.
    /newmembernotelegram - adds a member who has no telegram
    /summary - get summary.
    /memberinfo - get Info about you
    /groupinfo - gets Link to fancy group view
    /setcurrency - Sets exchange rate for foreign currrency to be used. All foreign amounts will be divide by this value.
    /getcurrency - Gets exchange rate
    /add - Adds amount. Please only input one number after, because it will be used as amount.
    /addforeign - Adds amount in foreign currency. Will be divided by currency value. Orginal amount will be discarded.
    /addother - Adds amount to different member.
    /addotherforeign - Adds amount to different member in foreign currency.
    /addpartial - Add amount only to certain group members
    /remove - Remove Entry
    /editamount - Edit Amount of entry
    /setpaypal - Set Paypal Link
    /transactions - Get Transactions
    /editdescription - Edit Description of entry
    /kick - Kick User`;
      const help = str.split('\n');
      help.sort();
      reply("test");
      console.log('test');
      reply(help.join('\n'));
    });
  }
}

export const app = new App();
