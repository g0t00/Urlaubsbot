// this.bot.command('setsheet', async ({reply, message, chat}) => {
//   if (!chat || !chat.id || !message || !message.text || !message.entities) {
//     return;
//   }
//   const groupObj = await GroupModel.findOne({telegramId: chat.id});
//
//   if (!groupObj) {
//     reply('Not in group / none initialized group');
//     return;
//   }
//   const messageText = message.text.substr(message.entities[0].length + 1);
//   groupObj.sheetId = messageText;
//   await groupObj.save();
//   reply('Sheet Id Set.');
// });
// this.bot.command('getsheetlink', async ({chat, reply, replyWithHTML}) => {
//   if (!chat || !chat.id) {
//     return;
//   }
//   const groupObj = await GroupModel.findOne({telegramId: chat.id});
//
//   if (!groupObj) {
//     reply('Not in group / none initialized group');
//     return;
//   }
//   const group = groupObj;
//   replyWithHTML('<a href="https://docs.google.com/spreadsheets/d/' + group.sheetId + '">Sheeterino</a>'); // eslint-disable-line camelcase
// });
// this.bot.command('export', async ({chat, reply}) => {
//   if (!chat || !chat.id) {
//     return;
//   }
//   const groupObj = await GroupModel.findOne({telegramId: chat.id});
//
//   if (!groupObj) {
//     reply('Not in group / none initialized group');
//     return;
//   }
//   reply('Currently disabled');
//   // (async () => {
//   //   try {
//   //     await Sheet.export(group);
//   //     ctx.reply('Export done.');
//   //   } catch (e) {
//   //     ctx.reply(util.inspect(e));
//   //     ctx.reply('Did you share to matecounterbot@matecounterbot.iam.gserviceaccount.com ?');
//   //   }
//   // })();
// });
// // const GoogleSpreadsheet = require('google-spreadsheet');
// // import {promisify} from 'bluebird';
// //
// // export class Sheet {
// //   _getColLetter(colIndex) {
// //     return String.fromCharCode(65 + colIndex);
// //   }
// //   async export (group) {
// //     const doc = new GoogleSpreadsheet(group.sheetId);
// //     const creds = require('./credentials.json');
// //     await promisify(doc.useServiceAccountAuth)(creds);
// //     const info = await promisify(doc.getInfo)();
// //     if (info.worksheets.length === 1) {
// //       await promisify(doc.addWorksheet, {context: doc})({title: 'data'});
// //     } else {
// //       await promisify(info.worksheets[1].setTitle)('data');
// //     }
// //     const dataSheet = info.worksheets[1];
// //     const rowCount = group.getCount() + 1;
// //     const colCount = group.members.length + 1;
// //
// //     const dataCells = await promisify(dataSheet.getCells)({
// //       'min-row': 1,
// //       'max-row': rowCount,
// //       'min-col': 1,
// //       'max-col': colCount,
// //       'return-empty': true
// //     });
// //     dataCells.forEach(cell => {
// //       cell.value = '';
// //     });
// //     group.members.forEach((member, i) => {
// //       dataCells[i + 1].value = member.name;
// //     });
// //     let entryCounter = 0;
// //
// //     group.members.forEach((member, i) => {
// //       member.entries.forEach(entry => {
// //         dataCells[(entryCounter + 1) * colCount].value = entry.description;
// //         dataCells[((entryCounter + 1) * colCount) + i + 1].value = entry.amount;
// //         entryCounter++;
// //       });
// //     });
// //     await promisify(dataSheet.bulkUpdateCells)(dataCells);
// //     const summarySheet = info.worksheets[0];
// //     await promisify(summarySheet.setTitle)('summary');
// //     const summaryCells = await promisify(summarySheet.getCells)({
// //       'min-row': 1,
// //       'max-row': group.members.length + 1,
// //       'min-col': 1,
// //       'max-col': 3,
// //       'return-empty': true
// //     });
// //     summaryCells.forEach(cell => {
// //       cell.value = '';
// //     });
// //     summaryCells[1].value = 'bezahlt';
// //     summaryCells[2].value = 'erhält';
// //
// //     group.members.forEach((member, i) => {
// //       summaryCells[3 * (i + 1)].value = member.name;
// //       summaryCells[(3 * (i + 1)) + 1].formula = '=Sum(data!' + module.exports._getColLetter(i + 1) + ':' + module.exports._getColLetter(i + 1) + ')';
// //       summaryCells[(3 * (i + 1)) + 2].formula = '=B' + (i + 2) + ' - Sum(data!B:' + module.exports._getColLetter(group.members.length) + ')/' + group.members.length;
// //     });
// //     await promisify(summarySheet.bulkUpdateCells)(summaryCells);
// //     group.lastExport = new Date().getTime();
// //   }
// // };
