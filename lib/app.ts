import Telegraf from 'telegraf';
import { ContextMessageUpdate, Markup, Middleware } from 'telegraf';
import { connect } from 'mongoose';
import { addMiddleware } from './add';
import * as cron from 'cron';
import * as express from 'express';
import { callbackHandler, IButton } from './callback-handler';
connect('mongodb://db:v6RB5Al0M27Z4kH@ds039311.mlab.com:39311/urlaubsbot', { useNewUrlParser: true });


import { Web } from './web';
import { GroupModel } from './group';
// import { Sheet } from'./sheet';
class App {
  express: express.Application;
  web: Web;
  bot: Telegraf<ContextMessageUpdate>;

  url: string;
  constructor()  {
    let webHook = false;
    let port: number;
    process.chdir(__dirname);
    if (process.env.BOT_ENV === 'MACBOOK') {
      port = 61237;
      this.bot = new Telegraf('***REMOVED***');
      this.url = 'http://127.0.0.1:61237/';
    } else {
      port = 61237;
      this.bot = new Telegraf('***REMOVED***');
      this.url = 'https://anton-schulte.de/urlaubsbot/';
      webHook = true;
    }
    this.bot.telegram.getMe().then(botInfo => {
      console.log(botInfo);
      (this.bot as any).options.username = botInfo.username;
    });
    this.express = express();
    this.express.set('view engine', 'ejs');
    this.express.set('views', '../views');

    this.express.use('/static', express.static('../public'));

    this.express.get('/', (_req, res) => {
      res.send('Hello World!');
    });
    if (webHook) {
      this.express.use(this.bot.webhookCallback('/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4'));
      this.bot.telegram.setWebhook(this.url + 'AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
    } else {
      console.log('starting Polling');
      this.bot.startPolling();
    }
    this.bot.use((addMiddleware as unknown) as Middleware<ContextMessageUpdate>);
    this.express.listen(port, () => {
      console.log('express listening on port', port);
    });
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use('/font-awesome', express.static('./node_modules/@fortawesome/fontawesome-free'));
    this.web = new Web();
    this.express.use('/group', this.web.router);
    // this.bot.use((ctx, next) => {
    //   ctx.groupObj = GroupModel.find({telegramId: ctx.chat.id});
    //   return next(ctx).then(async () => {
    //     await ctx.groupObj.save();
    //   });
    // });

    this.bot.on('group_chat_created', async ({ reply, chat, message }) => {
      if (!chat || !message || !message.from) {
        return;
      }
      const group = new GroupModel();
      group.name = chat.title ||  '';
      group.telegramId = chat.id;
      await group.save();
      reply('Neue Gruppe angelegt: ' + group.name);


      if (await group.addMember(message.from.first_name, message.from.id)) {
        reply(`Member ${message.from.first_name} added (id: ${message.from.id})`);
      }
    });
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
      if (groupObj.addMember(message.from.first_name, message.from.id)) {
        reply(`Member ${message.from.first_name} added (id: ${message.from.id})`);
      } else {
        reply('You are already in group!');
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
    this.bot.command('newmember', async ({ chat, reply, message }) => {
      if (!chat || !chat.id || !message || !message.from) {
        return reply('nope');
      }
      console.log(chat)
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }
      if (!await groupObj.addMember(message.from.first_name, message.from.id)) {
        reply('You are already in group!');
      }
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
      console.log('HIHI');
      if (!chat || !chat.id) {
        console.log('WTF');
        return;
      }
      console.log('b');
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });
      console.log('c');

      if (!groupObj) {
        return reply('Not in group / none initialized group');
      }
      replyWithHTML(`<a href="${this.url}group/${groupObj.id}">Inforino</a>`); // eslint-disable-line camelcase
    });

    this.bot.command('summary', async ({ chat, reply, replyWithHTML }) => {
      if (!chat || !chat.id) {
        return;
      }
      const groupObj = await GroupModel.findOne({ telegramId: chat.id });

      if (!groupObj) {
        reply('Not in group / none initialized group');
        return;
      }

      replyWithHTML('<code>' + groupObj.getSummaryTable() + '</code>');
    });
    this.bot.command('setcurrency', async ({ message, reply, chat }) => {
      if (!chat || !chat.id ||  !message ||  !message.text ||  !message.entities) {
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


    const exportJob = new cron.CronJob({
      cronTime: '*/15 * * * *',
      onTick: async () => {
        const groups = await GroupModel.find().exec();
        groups.forEach(group => {
          if (group.sheetId !== null) {
            // Sheet.export(group);
          }
        });
      },
      runOnInit: true
    });
    exportJob.start();
    console.log('exportJob status', exportJob.running);

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
      replyWithHTML(group.getMemberinfo(message.from.id));
    });
    this.bot.command('remove', async ({ reply, message, chat }) => {
      if (!chat || !chat.id ||  !message || !message.from) {
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
        clicked: async () => { return true;}
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
    this.bot.command('editdescription', async ({ reply, message, chat }) => {
      if (!chat || !chat.id ||  !message || !message.from) {
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
        clicked: async () => { return true;}
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
    this.bot.command('numbers', ({reply, chat, telegram}) => {
      (async () => {if (!chat) {
        return;
      }
      // return;
      let done = false;
      let addNumber = '';
      while (!done) {
        await new Promise(async resolve => {
          console.log(addNumber, 'a');
          let numbers = [[1, 2, 3], [4,5,6], [7,8,9], [0,'.']];
          const buttons: IButton[][] = numbers.map(numbersRow => numbersRow.map(number => {
            return {
              text: String(number),
              clicked: async () => {
                addNumber += String(number);
                console.log('added', number);
                resolve();
                return true;
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
              return true;
            }
          }]);
          const keyboard = callbackHandler.getKeyboard(buttons);
          await telegram.sendMessage(chat.id, `Add numbers: current input ${addNumber}`, {
            reply_markup:
              Markup.inlineKeyboard(keyboard)
            // .oneTime()
            // .resize()
            // .extra()
          });
        });
      }
      reply('Number: ' + addNumber);})();
    });
      this.bot.command('editamount', async ({ reply, message, chat }) => {
        if (!chat || !chat.id ||  !message || !message.from) {
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
          clicked: async () => {return true}
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
    /setsheet - set Google Sheets ID to export to
    /getsheetlink - get Google Sheets Link
    /export - export to google Sheet
    /memberinfo - get Info about you
    /groupinfo - gets Link to fancy group view
    /setcurrency - Sets exchange rate for foreign currrency to be used. All foreign amounts will be divide by this value.
    /getcurrency - Gets exchange rate
    /add - Adds amount. Please only input one number after, because it will be used as amount.
    /addforeign - Adds amount in foreign currency. Will be divided by currency value. Orginal amount will be discarded.
    /addother - Adds amount to different member.
    /addotherforeign - Adds amount to different member in foreign currency.`;
        reply(str);
      });
    }
}

  export const app = new App();
