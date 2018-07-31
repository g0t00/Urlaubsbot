const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const express = require('express');
const LocalSession = require('telegraf-session-local');
const uuidv1 = require('uuid/v1');
const _ = require('lodash');

const Web = require('./web');
const Group = require('./group');
const Database = require('./database');
const Sheet = require('./sheet');

let bot;
let webHook = false;
let url;
process.chdir(__dirname);

if (process.env.BOT_ENV === 'MACBOOK') {
  bot = new Telegraf('***REMOVED***');
  url = 'http://127.0.0.1:61237/';
} else {
  bot = new Telegraf('698559448:AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
  url = 'https://anton-schulte.de/urlaubsbot/';
  webHook = true;
}
bot.telegram.getMe().then(botInfo => {
  bot.options.username = botInfo.username;
});
const app = express();
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});
if (webHook) {
  app.use(bot.webhookCallback('/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4'));
  bot.telegram.setWebhook(url + 'AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
} else {
  bot.startPolling();
}
app.listen(61237, () => {
  console.log('express listening');
});

const database = new Database(bot.telegram);
app.use(express.json());
app.use(express.urlencoded());
app.use('/font-awesome', express.static('./node_modules/@fortawesome/fontawesome-free'));

app.use('/group', (new Web(database)));
app.use((req, res, next) => {
  console.log('database save');
  database.save();
  next();
});
bot.use((ctx, next) => {
  ctx.groupObj = database.getGroupById(ctx.chat.id);
  return next(ctx).then(() => {
    database.save();
  });
});
bot.use((new LocalSession({database: 'session.db'})));

bot.on('group_chat_created', ({reply, chat, message}) => {
  const group = new Group({name: chat.title, id: chat.id});
  reply('Neue Gruppe angelegt: ' + group.name);

  database.newGroup(group);

  if (group.addMember(message.from.first_name, message.from.id)) {
    reply(`Member ${message.from.first_name} added (id: ${message.from.id})`);
  }
});
bot.on('new_chat_members', ({groupObj, reply, message}) => {
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
bot.command('initializegroup', ctx => {
  if (ctx.groupObj) {
    ctx.reply('Group already initialized');
    return;
  }
  const group = new Group({name: ctx.chat.title, id: ctx.chat.id}, bot.telegram);
  database.newGroup(group);
  ctx.reply('Group initialized');
});
bot.command('members', ctx => {
  if (ctx.groupObj) {
    if (ctx.groupObj.members.length === 0) {
      ctx.reply('Group empty.');
      return;
    }
    const str = 'Members: ' + ctx.groupObj.members.map(member => member.name).join(', ');
    ctx.reply(str);
  } else {
    ctx.reply('Not in group / none initialized group');
  }
});
bot.command('membersdetail', ctx => {
  if (ctx.groupObj) {
    if (ctx.groupObj.members.length === 0) {
      ctx.reply('Group empty.');
      return;
    }
    const str = 'Members: ' + ctx.groupObj.members.map(member => `${member.name} (${member.id})`).join(', ');
    ctx.reply(str);
  } else {
    ctx.reply('Not in group / none initialized group');
  }
});
bot.command('newmember', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  if (!ctx.groupObj.addMember(ctx.message.from.first_name, ctx.message.from.id)) {
    ctx.reply('You are already in group!');
  }
});
bot.command('newmembernotelegram', ({message, groupObj, reply}) => {
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
  if (!groupObj.addMember(memberName, memberName)) {
    reply('You are already in group!');
  }
});
bot.command('groupinfo', ({groupObj, reply}) => {
  if (!groupObj) {
    return reply('Not in group / none initialized group');
  }
  reply(`<a href="${url}group/${groupObj.id}">Inforino</a>`, {parse_mode: 'html'}); // eslint-disable-line camelcase
});

bot.command('summary', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;

  ctx.replyWithHTML('<code>' + group.getSummaryTable() + '</code>');
});
bot.command('setcurrency', ({groupObj, message, reply}) => {
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
bot.command('getcurrency', ({groupObj, reply}) => {
  if (!groupObj) {
    return reply('Not in group / none initialized group');
  }
  if (groupObj.currency === null) {
    return reply('No Currency set!');
  }
  reply(`Currency is ${groupObj.currency}.`);
});
const add = (ctx, useForeign) => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const member = ctx.groupObj.getMemberById(ctx.message.from.id);
  if (member === null) {
    ctx.reply('You are not in this group. Please use /newMember first!');
    return;
  }
  const group = ctx.groupObj;

  const memberId = ctx.message.from.id;
  const messageText = ctx.message.text.substr(ctx.message.entities[0].length + 1);

  const matches = messageText.match(/\d+[.,]?\d*/);
  if (!matches) {
    ctx.reply('No Amount found!');
    return;
  }
  let amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    ctx.reply('Could not parse Amount!');
    return;
  }
  if (useForeign) {
    if (group.currency === null) {
      return ctx.reply('Currency not set!');
    }
    amount /= group.currency;
  }
  let description = messageText.replace(/\d+[.,]?\d*/, '').trim();
  if (description === '') {
    description = 'no desc';
  }
  if (!group.addEntry(memberId, description, amount)) {
    ctx.reply('Error while adding!');
  }
};
bot.command('add', ctx => {
  add(ctx, false);
});
bot.command('addforeign', ctx => {
  add(ctx, true);
});
const addOther = ({session, groupObj, message, reply}, useForeign) => {
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const messageText = message.text.substr(message.entities[0].length + 1);
  const matches = messageText.match(/\d+[.,]?\d*/);
  if (!matches) {
    reply('No Amount found!');
    return;
  }
  let amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    reply('Could not parse Amount!');
    return;
  }
  if (useForeign) {
    if (groupObj.currency === null) {
      return reply('Currency not set!');
    }
    amount /= groupObj.currency;
  }
  let description = messageText.replace(/\d+[.,]?\d*/, '').trim();
  if (description === '') {
    description = 'no desc';
  }
  session.addOthers = session.addOthers || [];
  const uuid = uuidv1();
  session.addOthers.push({
    description,
    amount,
    uuid
  });
  const {members} = groupObj;
  const keyboard = members.map(member => {
    return [Markup.callbackButton(member.name, 'a' + uuid + '/' + member.id)];
  });
  keyboard.push([Markup.callbackButton('cancel', 'c')]);
  return reply(`Entry preview: "${description}: ${amount}".\nPlease select member.`, Markup
    .inlineKeyboard(keyboard)
    // .oneTime()
    // .resize()
    .extra()
  );
};
bot.command('addother', ctx => {
  addOther(ctx, false);
});
bot.command('addotherforeign', ctx => {
  addOther(ctx, true);
});
bot.command('setsheet', ({groupObj, reply, message}) => {
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const group = groupObj;
  const messageText = message.text.substr(message.entities[0].length + 1);
  group.sheetId = messageText;
  reply('Sheet Id Set.');
});
bot.command('getsheetlink', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;
  ctx.reply('<a href="https://docs.google.com/spreadsheets/d/' + group.sheetId + '">Sheeterino</a>', {parse_mode: 'html'}); // eslint-disable-line camelcase
});
bot.command('export', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;
  (async () => {
    try {
      await Sheet.export(group);
    } catch (e) {
      console.error(e);
    }
    ctx.reply('Export done.');
  })();
});
bot.command('memberinfo', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;
  ctx.replyWithHTML(group.getMemberinfo(ctx.message.from.id));
});
bot.command('remove', ({groupObj, reply, message}) => {
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }

  const member = groupObj.getMemberById(message.from.id);
  if (member === null) {
    return;
  }
  const keyboard = member.entries.map(entry => {
    return Markup.callbackButton(entry.description + ': ' + entry.amount, 'r' + entry.uuid);
  });
  keyboard.push(Markup.callbackButton('cancel', 'c'));
  return reply('Please select entry to delete:', Markup
    .inlineKeyboard([keyboard])
    // .oneTime()
    // .resize()
    .extra()
  );
});
bot.action(/r/, async ({groupObj, callbackQuery, telegram, reply}) => {
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const uuid = callbackQuery.data.replace(/^r/, '');
  try {
    groupObj.removeEntry(callbackQuery.from.id, uuid);
  } catch (e) {
    reply(JSON.stringify(e));
  } finally {
    telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
  }
});
bot.action(/a/, async ({groupObj, callbackQuery, telegram, reply, session}) => {
  if (!groupObj) {
    reply('Not in group / none initialized group');
    return;
  }
  const matches = callbackQuery.data.match(/^a([0-9a-f-]*)\/(.*)$/i, '');
  if (matches === null) {
    telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
    return reply('Can not parse callback.');
  }
  const [, uuid, memberId] = matches;
  const entry = _.find(session.addOthers, entries => {
    return entries.uuid === uuid;
  });
  if (typeof entry === 'undefined') {
    telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
    return reply('Can not find preview entry');
  }
  groupObj.addEntry(memberId, entry.description, entry.amount);
  telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
  const index = _.findIndex(session.addOthers, entries => entries.uuid === uuid);
  session.addOthers.splice(index, 1);
});
bot.action('c', async ({callbackQuery, telegram}) => {
  try {
    telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
  } catch (e) {
    console.error(e, callbackQuery);
  }
});
bot.command('help', ({reply}) => {
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
