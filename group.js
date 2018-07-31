const AsciiTable = require('ascii-table');
const uuid = require('uuid/v1');
const _ = require('lodash');

module.exports = class Group {
  constructor({name, id, members = null, sheetId = null, currency = null}, telegram) {
    this.members = members || [];
    this.id = id;
    this.name = name;
    this.members.forEach(member => {
      if (!member.entries) {
        member.entries = [];
      }
    });
    this.telegram = telegram;
    this.sheetId = sheetId;
    this.currency = currency;
    this.members.forEach(member => {
      member.entries.forEach(entry => {
        if (typeof entry.uuid === 'undefined' || entry.uuid === null) {
          entry.uuid = uuid();
        }
      });
    });
  }

  getSum() {
    return this.members.reduce((accMembers, member) => {
      return accMembers + member.entries.reduce((accEntries, entry) => {
        return accEntries + entry.amount;
      }, 0);
    }, 0);
  }

  getCount() {
    return this.members.reduce((accMembers, member) => {
      return accMembers + member.entries.length;
    }, 0);
  }

  getMembers() {
    return this.members;
  }

  getMembersWithSums() {
    return this.members.map(member => {
      return {
        name: member.name,
        sum: member.entries.reduce((acc, add) => acc + add.amount, 0)
      };
    });
  }

  deleteEntryByUuid(uuid) {
    let found = false;
    let removedEntry;
    let memberForEntry;
    this.members.forEach(member => {
      if (found === false) {
        const i = _.findIndex(member.entries, entry => entry.uuid === uuid);
        if (i > -1) {
          found = true;
          removedEntry = member.entries.splice(i, 1)[0];
          memberForEntry = member;
        }
      }
    });
    this.telegram.sendMessage(this.id, `Removed Entry: ${removedEntry.description}: ${removedEntry.amount}\n` +
    `for ${memberForEntry.name} (${memberForEntry.id})`);

    return found;
  }

  getMemberById(id) {
    return _.find(this.members, member => String(member.id) === String(id));
  }

  addMember(name, id) {
    let double = false;
    this.members.forEach(member => {
      if (member.id === id) {
        double = true;
      }
    });
    if (double) {
      return false;
    }
    const member = {name, id, entries: []};
    this.members.push(member);
    this.telegram.sendMessage(this.id, `Member ${name} added (id: ${id}`);
    return true;
  }

  addEntry(memberId, description, amount) {
    let found = false;
    this.members.forEach(member => {
      if (String(member.id) === String(memberId)) {
        member.entries.push({
          description, amount, time: Date.now(), uuid: uuid()
        });
        this.telegram.sendMessage(this.id, `Entry added To ${this.getMemberById(member.id).name} (${member.id})\n` +
      `${description}: ${amount}`);
        found = true;
      }
    });
    if (!found) {
      console.log(`User not found ${memberId}, ${description}, ${amount}`);
    }
    return found;
  }

  removeEntry(memberId, uuid) {
    const member = this.getMemberById(memberId);
    if (member === null) {
      throw new Error('member not found!');
    }
    const index = _.findIndex(member.entries, entry => {
      return entry.uuid === uuid;
    });
    if (index === -1) {
      throw new Error('uuid not found!');
    }
    const removedEntry = member.entries.splice(index, 1)[0];
    this.telegram.sendMessage(this.id, `Removed Entry: ${removedEntry.description}: ${removedEntry.amount}\n` +
    `for ${member.name} (${member.id})`);

    return removedEntry;
  }

  editEntry(memberId, uuid, {description, amount}) {
    const member = this.getMemberById(memberId);
    if (member === null) {
      throw new Error('member not found!');
    }
    const index = _.findIndex(member.entries, entry => {
      return entry.uuid === uuid;
    });
    if (index === -1) {
      throw new Error('uuid not found!');
    }
    const newEntry = member.entries[index];
    const oldEntry = JSON.parse(JSON.stringify(newEntry));
    newEntry.description = description;
    newEntry.amount = amount;
    this.telegram.sendMessage(this.id, `Changed Entry from ${oldEntry.description}: ${oldEntry.amount}\n` +
    `-> ${newEntry.description}: ${newEntry.amount}\n` +
    `for ${member.name} (${member.id})`);

    return newEntry;
  }

  getSummaryTable() {
    const sum = this.getSum();
    const avg = sum / this.members.length;
    const memberSums = this.getMembersWithSums();
    const table = new AsciiTable();
    table.addRow('sum', sum, ' ');
    table.addRow('average', avg, ' ');
    memberSums.forEach(member => {
      table.addRow(member.name, member.sum, avg - member.sum);
    });
    // Console.log(table.toString());
    return table.toString();
  }

  getMemberinfo(memberId) {
    const member = this.getMemberById(memberId);
    if (member === null) {
      return 'No Info found!';
    }
    const memberSum = member.entries.reduce((acc, entry) => {
      return acc + entry.amount;
    }, 0);
    const sum = this.getSum();
    const avg = sum / this.members.length;

    let str = `${member.name} (${member.id})\n` +
    `member sum: ${memberSum}\ngroup average: ${avg}.\n`;
    str += '<code>';
    const table = new AsciiTable();

    member.entries.forEach(entry => {
      table
        .addRow(entry.description, entry.amount);
    });
    str += table.toString();
    str += '</code>';
    return str;
  }
};
