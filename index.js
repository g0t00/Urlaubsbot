const fs = require('fs');
const Telegraf = require('telegraf')
const express = require('express');
const Web = require('./web');
let bot;
let webHook = false;
let url;
console.log('Starting directory: ' + process.cwd());
process.chdir(__dirname);

console.log(__dirname, 'dirname')
console.log('New directory: ' + process.cwd());

if (process.env.BOT_ENV == 'MACBOOK') {
  bot = new Telegraf('***REMOVED***');
  url = 'http://localhost:61237/';
} else {
  // TLS options
  // const tlsOptions = {
  //   key: fs.readFileSync('../.config/letsencrypt/live/mixed.anton-schulte.de/privkey.pem'),
  //   cert: fs.readFileSync('../.config/letsencrypt/live/mixed.anton-schulte.de/cert.pem')
  // }
  bot = new Telegraf('698559448:AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
  // bot.startWebhook('/', null, 61237);
  // bot.telegram.deleteWebhook();
  // bot.telegram.setWebhook('https://anton-schulte.de/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
  url = 'https://anton-schulte.de/urlaubsbot/';
  webHook = true;
}

const app = express();
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});
if (webHook) {
  app.use(bot.webhookCallback('/AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4'));
  console.log(url + 'AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4', 'url');
  bot.telegram.setWebhook(url + 'AAHzTPVsfQLlisWSkWl6jH795cWMX2RsyS4');
} else {
  bot.startPolling();
}
app.listen(61237, () => {
  console.log('express listening');
});
const Group = require('./group');
const Database = require('./database');
let database = new Database();
const Sheet = require('./sheet');
const AsciiTable = require('ascii-table');
let groups = [];
// newGroup scene
app.use('/group/:id', (new Web(database)));

bot.use((ctx, next) => {
  ctx.groupObj = database.getGroupById(ctx.chat.id);
  return next(ctx).then(() => {
    database.save();
  });
})
// bot.use(GroupMiddleware).middleware();

// bot.use(stage.middleware())
bot.on('group_chat_created', async (ctx) => {
  let group = new Group(ctx.chat.title, ctx.chat.id);
  ctx.reply('Neue Gruppe angelegt: ' + group.name);
  database.newGroup(group);
});
bot.on('new_chat_members', async (ctx) => {
  console.log('new_chat_members', ctx);
});
bot.command('initializeGroup', ctx => {
  if (ctx.groupObj) {
    ctx.reply('Group already initialized');
    return;
  }
  let group = new Group(ctx.chat.title, ctx.chat.id);
  database.newGroup(group);
  ctx.reply('Group initialized');
})
bot.command('members', ctx => {
  console.log(ctx.groupObj);
  if (ctx.groupObj) {
    if (ctx.groupObj.members.length == 0) {
      ctx.reply('Group empty.');
      return;
    }
    let str = 'Members: ' + ctx.groupObj.members.map(member => member.name).join(', ');
    ctx.reply(str);
  } else {
    ctx.reply('Not in group / none initialized group');
  }
});
bot.command('membersDetail', ctx => {
  if (ctx.groupObj) {
    if (ctx.groupObj.members.length == 0) {
      ctx.reply('Group empty.');
      return;
    }
    let str = 'Members: ' + ctx.groupObj.members.map(member => `${member.name} (${member.id})`).join(', ');
    ctx.reply(str);
  } else {
    ctx.reply('Not in group / none initialized group');
  }
});
bot.command('newMember', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  console.log(ctx.groupObj);
  let mentions = ctx.message.entities.filter(entity => entity.type == 'text_mention');
  console.log(ctx.message.entities, mentions);
  if (mentions.length > 0) {
    mentions.forEach(mention => {
      if (ctx.groupObj.addMember(mention.user.first_name, mention.user.id)) {
        ctx.reply(`Member ${mention.user.first_name} added (id: ${mention.user.id})`);
      } else {
        ctx.reply(`'${ctx.message.from.first_name}' are already in group!`);
      }
    })
  } else {
    if (ctx.groupObj.addMember(ctx.message.from.first_name, ctx.message.from.id)) {
      ctx.reply(`Member ${ctx.message.from.first_name} added (id: ${ctx.message.from.id})`);
    } else {
      ctx.reply('You are already in group!');
    }
  }
});
bot.command('groupinfo', ({groupObj, reply}) => {
  reply(`<a href="${url}group/${groupObj.id}">Inforino</a>`, {parse_mode: 'html'});
})
// bot.command('test', async ctx => {
//   let test = await ctx.telegram.getChatMember(ctx.chat.id, ctx.groupObj.members[1].id);
//   console.log(test);
// })
bot.command('summary', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  let group = ctx.groupObj;
  let sum = group.getSum();
  let avg = sum/group.members.length;
  let memberSums = group.getMembersWithSums();
  var table = new AsciiTable()
  table.addRow('sum', sum, ' ');
  table.addRow('average', avg, ' ');
  memberSums.forEach(member => {
    table.addRow(member.name, member.sum, avg - member.sum);
  })
  ctx.replyWithHTML('<code>' + table.toString() + '</code>');
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
bot.command('setSheet', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  let group = ctx.groupObj;
  let message = ctx.message.text;
  message = message.replace('/setSheet ', '');
  group.sheetId = message;
  ctx.reply('Sheet Id Set.');
});
bot.command('getSheetLink', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  let group = ctx.groupObj;
  ctx.reply('<a href="https://docs.google.com/spreadsheets/d/' + group.sheetId + '">Sheeterino</a>', {parse_mode: 'html'});
})
bot.command('export', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  let group = ctx.groupObj;
  (async () => {
    try {
      await Sheet.export(group);
    } catch (e) {
      console.error(e);
    } finally {

    }

    ctx.reply('Export done.');
  })();
})
bot.command('memberInfo', ctx => {
  if (!ctx.groupObj) {
    ctx.reply('Not in group / none initialized group');
    return;
  }
  let group = ctx.groupObj;
  let member = ctx.groupObj.getMemberById(ctx.message.from.id);
  if (member === null) {
    ctx.reply('No Info found!');
    return;
  }
  let memberSum = member.entries.reduce((acc, entry) => {
    return acc + entry.amount;
  }, 0);
  let sum = group.getSum();
  let avg = sum/group.members.length;

  let str = `${member.name} (${member.id})\n`
  + `member sum: ${memberSum}\ngroup average: ${avg}.\n`;
  str += '<code>';
  var table = new AsciiTable()

  member.entries.forEach(entry => {
    table
      .addRow(entry.description, entry.amount);
  });
  str += table.toString();
  str += '</code>';
  ctx.replyWithHTML(str);
});
bot.command('help', ctx => {
  let str = `/initializeGroup initialize group, so bot knows it;
/newMember adds yourself to group.
/summary get summary.
/setSheet ID - set Google Sheets ID to export to
/getSheetLink get Google Sheets Link
/export export to google Sheet
/memberInfo get Info about you
/add - Adds amount. Please only input one number after, because it will be used as amount.
`
ctx.reply(str);
})
bot.on('message', (ctx) => {
  // console.log(ctx.message);
})

// if (process.env.BOT_ENV == 'MACBOOK') {
// }
