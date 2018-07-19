const GoogleSpreadsheet = require('google-spreadsheet');
const promisify = require('bluebird').promisify;

module.exports = {
  _getColLetter: colIndex => {
    return String.fromCharCode(65 + colIndex)
  },
  export: async group => {

    let doc = new GoogleSpreadsheet(group.sheetId);
    let creds = require('./credentials.json');
    await promisify(doc.useServiceAccountAuth)(creds);
    let info = await promisify(doc.getInfo)();
    if (info.worksheets.length == 1) {
      await promisify(doc.addWorksheet, {context: doc})({title: 'data'});
    }
    let dataSheet = info.worksheets[1];
    let rowCount = group.getCount() + 1;
    let colCount = group.members.length + 1;

    let dataCells = await promisify(dataSheet.getCells)({
      'min-row': 1,
      'max-row': rowCount,
      'min-col': 1,
      'max-col': colCount,
      'return-empty': true
    });
    group.members.forEach((member, i) => dataCells[i+1].value = member.name);
    console.log(dataCells.length);
    let entryCounter = 0;
    group.members.forEach((member, i) => {
      member.entries.forEach(entry => {
        dataCells[(entryCounter + 1) * colCount].value = entry.description;
        dataCells[(entryCounter + 1) * colCount + i + 1].value = entry.amount;
        entryCounter++;
      });
    });
    await promisify(dataSheet.bulkUpdateCells)(dataCells);
    let summarySheet = info.worksheets[0];
    let summaryCells = await promisify(summarySheet.getCells)({
      'min-row': 1,
      'max-row': group.members.length + 1,
      'min-col': 1,
      'max-col': 3,
      'return-empty': true
    });
    summaryCells[1].value = 'bezahlt';
    summaryCells[2].value = 'erhält';

    group.members.forEach((member, i) => {
      summaryCells[3 * (i + 1)].value = member.name;
      summaryCells[3 * (i + 1) + 1].formula = '=Sum(data!' + module.exports._getColLetter(i + 1) + ':' + module.exports._getColLetter(i + 1) + ')';
      summaryCells[3 * (i + 1) + 2].formula = '=B' + (i + 2) + ' - Sum(data!B:' + module.exports._getColLetter(group.members.length) + ')/' + group.members.length;
    });
    await promisify(summarySheet.bulkUpdateCells)(summaryCells);

  }
};
