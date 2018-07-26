const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const LocalSession = require('telegraf-session-local');
const uuidv1 = require('uuid/v1');
const _ = require('lodash');

const Group = require('./group');
const Database = require('./database');
const Sheet = require('./sheet');

let bot;
if (process.env.BOT_ENV === 'MACBOOK') {
  bot = new Telegraf('***REMOVED***', {username: 'UrlaubBetaBot'});
} else {
  bot = new Telegraf('698559448:AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4', {username: 'UrlaubsrechnerBot'});
  // bot.telegram.setWebhook('http://anton-schulte.de:61237/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
}

const database = new Database();

bot.use((ctx, next) => {
  ctx.groupObj = database.getGroupById(ctx.chat.id);
  return next(ctx).then(() => {
    database.save();
  });
});
bot.use((new LocalSession({database: 'session.db'})));

bot.on('group_chat_created', async ctx => {
  const group = new Group(ctx.chat.title, ctx.chat.id);
  ctx.reply('Neue Gruppe angelegt: ' + group.name);
  database.newGroup(group);
});
bot.on('new_chat_members', async ctx => {
  console.log('new_chat_members', ctx);
});
bot.command('initializegroup', ctx => {
  if (ctx.groupObj) {
    ctx.reply('Group already initialized');
    return;
  }
  const group = new Group(ctx.chat.title, ctx.chat.id);
  database.newGroup(group);
  ctx.reply('Group initialized');
});
bot.command('members', ctx => {
  console.log(ctx.groupObj);
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
  console.log(ctx.groupObj);
  if (ctx.groupObj.addMember(ctx.message.from.first_name, ctx.message.from.id)) {
    ctx.reply(`Member ${ctx.message.from.first_name} added (id: ${ctx.message.from.id})`);
  } else {
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
  if (groupObj.addMember(memberName, memberName)) {
    reply(`Member ${memberName} added (id: ${memberName})`);
  } else {
    reply('You are already in group!');
  }
});
bot.command('test', async ctx => {
  const test = await ctx.telegram.getChatMember(ctx.chat.id, ctx.groupObj.members[1].id);
  console.log(test);
});
bot.command('summary', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;

  ctx.replyWithHTML('<code>' + group.getSummaryTable() + '</code>');
});
bot.command('add', ctx => {
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
  const amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    ctx.reply('Could not parse Amount!');
    return;
  }
  let description = messageText.replace(/\d+[.,]?\d*/, '').trim();
  if (description === '') {
    description = 'no desc';
  }
  if (group.addEntry(memberId, description, amount)) {
    ctx.reply('Entry added To ' + group.getMemberById(memberId).name + '(' + memberId + ')');
  } else {
    ctx.reply('Error while adding!');
  }
});
bot.command('addother', ({session, groupObj, message, reply}) => {
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
  const amount = parseFloat(matches[0].replace(',', '.'));
  if (isNaN(amount)) {
    reply('Could not parse Amount!');
    return;
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
    return Markup.callbackButton(member.name, 'a' + uuid + '/' + member.id);
  });
  keyboard.push(Markup.callbackButton('cancel', 'c'));
  return reply(`Entry preview: "${description}: ${amount}".\nPlease select member.`, Markup
    .inlineKeyboard([keyboard])
    // .oneTime()
    // .resize()
    .extra()
  );
});
bot.command('setsheet', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  const group = ctx.groupObj;
  let message = ctx.message.text;
  message = message.replace('/setSheet ', '');
  group.sheetId = message;
  ctx.reply('Sheet Id Set.');
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
  console.log('hello');
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
  console.log(member);
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
    const removedEntry = groupObj.removeEntry(callbackQuery.from.id, uuid)[0];
    reply('Removed Entry: ' + removedEntry.description + ': ' + removedEntry.amount);
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
    console.log(callbackQuery.data);
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
  const member = groupObj.getMemberById(memberId);
  console.log(memberId, 'memberId', groupObj.members, member);
  const index = _.findIndex(session.addOthers, entries => entries.uuid === uuid);
  session.addOthers.splice(index, 1);
  return reply('Entry added To ' + member.name + '(' + memberId + ')');
});
bot.action('c', async ({callbackQuery, telegram}) => {
  try {
    telegram.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
  } catch (e) {
    console.error(e);
    console.log(callbackQuery);
  }
});
bot.command('help', ctx => {
  const str = `/initializegroup - initialize group, so bot knows it;
/newmember - adds yourself to group.
/summary - get summary.
/setsheetid - set Google Sheets ID to export to
/getsheetlink - get Google Sheets Link
/export - export to google Sheet
/memberinfo - get Info about you
/add - Adds amount. Please only input one number after, because it will be used as amount.
`;
  ctx.reply(str);
});
// A bot.on('message', ctx => {
//   // Console.log(ctx.message);
// });

bot.startPolling();
