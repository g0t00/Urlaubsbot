// import {Document, Schema, Model, model} from 'mongoose';
import { prop, post, Typegoose, InstanceType, instanceMethod, arrayProp, pre } from 'typegoose';
import { IGroupData } from './interfaces'
const AsciiTable = require('ascii-table');
import { v1 as uuid } from 'uuid';
import * as _ from 'lodash';
import { Member } from './member';
import { Entry } from './entry';
import { app } from './app';
import {web} from './web';
export interface IMemberWithSum extends Member {
  sum: number;
}

@pre<Group>('save', function(next) { // or @pre(this: Car, 'save', ...
this.lastExport = new Date();
  next();
})
@post<Group>('save', function (group) {
  web.emitter.emit(group.id);
})
export class Group extends Typegoose {
  @prop({ required: true, index: true })
  telegramId: number;
  @prop()
  name?: string;
  @arrayProp({
    items: Member,
    default: []
  })
  members: Member[];
  @prop()
  sheetId?: string;
  @prop()
  currency?: number;
  @prop()
  lastExport?: Date;
  @instanceMethod
  getSum(this: InstanceType<Group>) {
    return this.members.reduce((accMembers, member) => {
      return accMembers + member.entries.reduce((accEntries, entry) => {
        return accEntries + entry.amount;
      }, 0);
    }, 0);
  };
  @instanceMethod
  renderEntry(this: InstanceType<Group>, entry: Entry): string {
    let text = entry.description + ': ' + entry.amount;
    if (entry.partialGroupMembers) {
      text += 'Members having to pay for this: ' + entry.partialGroupMembers.map(memberId => {
        const member = this.members.find(member => member.id === memberId);
        if (member) {
          return member.name;
        }
      }).join(', ');
    }
    return text;
  }
  @instanceMethod
  getCount(this: InstanceType<Group>) {
    return this.members.reduce((accMembers, member) => {
      return accMembers + member.entries.length;
    }, 0);
  };
  @instanceMethod
  evaluate(this: InstanceType<Group>): IGroupData {
    return {
      id: this.id,
      name: this.name || '',
      members: this.members.map(member => {
        let hasPayed = 0;
        let toPay = 0;
        for (const entry of member.entries) {
          hasPayed += entry.amount;
        }
        for (const memberToPay of this.members) {
          for (const entry of memberToPay.entries) {
            if (!entry.partialGroupMembers || entry.partialGroupMembers.length === 0) {
              toPay += entry.amount / this.members.length;
            } else if (entry.partialGroupMembers.indexOf(member.id) > -1) {
              toPay += entry.amount / entry.partialGroupMembers.length;
            }
          }
        }
        const entries = member.entries.map(entry => {
          const partialGroupMembers = entry.partialGroupMembers ? entry.partialGroupMembers.map(partialGroupMember=> {
            const member = this.members.find(member => member.id === partialGroupMember);
            if (member) {
              return member.name;
            } else {
              throw new Error('Invalid Entry');
            }
          }) : undefined;
          return {
            description: entry.description,
            amount: entry.amount,
            time: entry.time,
            uuid: entry.uuid,
            partialGroupMembers}
            ;
        });
        hasPayed = parseFloat(hasPayed.toFixed(2));
        toPay = parseFloat(toPay.toFixed(2));

        return {
          id: member.id,
          name: member.name,
          hasPayed,
          toPay,
          entries: entries
        };
      })
    };
  }
  @instanceMethod
  async deleteEntryByUuid(this: InstanceType<Group>, uuid: string) {
    let found = false;
    for (const member of this.members) {
      if (found === false) {

        const i = member.entries.findIndex(entry => entry.uuid === uuid);
        if (i > -1) {
          found = true;
          const removedEntry = member.entries.splice(i, 1)[0];
          await this.save();
          await app.bot.telegram.sendMessage(this.telegramId, `Removed Entry: ${removedEntry.description}: ${removedEntry.amount}\n` +
            `for ${member.name} (${member.id})`);
          return true;
        }
      }
    }

    return false;
  }
  @instanceMethod
  async findEntryByUuid(this: InstanceType<Group>, uuid: string): Promise<Entry|undefined> {
    for (const member of this.members) {
        return member.entries.find(entry => entry.uuid === uuid);
    }
    return undefined;
  }
  @instanceMethod
  getMemberById(this: InstanceType<Group>, id: number) {
    return _.find((this.members as Member[]), member => member.id === id);
  }
  @instanceMethod
  async addMember(this: InstanceType<Group>, name: string, id: number) {
    let double = false;
    this.members.forEach(member => {
      if (member.id === id) {
        double = true;
      }
    });
    if (double) {
      app.bot.telegram.sendMessage(this.telegramId, `Member aleady in group!`);
      return false;
    }
    const member = new Member();
    member.name = name;
    member.id = id;
    this.members.push(member);
    await this.save();
    try {
      await app.bot.telegram.sendMessage(this.telegramId, `Member ${name} added (id: ${id}`);
    } catch(e) {
      console.error('WTF', e);
    }
    return true;
  }
  @instanceMethod
  async addEntry(this: InstanceType<Group>, memberId: number, description: string, amount: number, partialGroupMembers?: number[]) {
    let found = false;
    this.members.forEach(member => {
      if (member.id === memberId) {
        const entry = new Entry();
        entry.description = description;
        entry.amount = amount;
        entry.time = new Date();
        entry.uuid = uuid();
        if (partialGroupMembers) {
          entry.partialGroupMembers = partialGroupMembers;
        }
        member.entries.push(entry);
        const renderText = this.renderEntry(entry);
        app.bot.telegram.sendMessage(this.telegramId, `Entry added To ${member.name} (${member.id})\n` +
          renderText);
        found = true;
      }
    });
    if (!found) {
      console.log(`User not found ${memberId}, ${description}, ${amount}`);
    }
    await this.save();
    return found;
  }

  @instanceMethod
  async removeEntry(this: InstanceType<Group>, memberId: number, uuid: string) {
    const member = this.getMemberById(memberId);
    if (!member) {
      throw new Error('member not found!');
    }
    const index = member.entries.findIndex(entry => entry.uuid === uuid);
    if (index === -1) {
      throw new Error('uuid not found!');
    }
    const removedEntry = member.entries.splice(index, 1)[0];
    app.bot.telegram.sendMessage(this.telegramId, `Removed Entry: ${removedEntry.description}: ${removedEntry.amount}\n` +
      `for ${member.name} (${member.id})`);
    await this.save();
    return removedEntry;
  }

  @instanceMethod
  async editEntry(this: InstanceType<Group>, memberId: number, uuid: string, description: string, amount: number) {
    const member = this.getMemberById(memberId);
    if (!member) {
      throw new Error('member not found!');
    }
    const newEntry = member.entries.find(entry => entry.uuid === uuid);
    if (!newEntry) {
      throw new Error('uuid not found!');
    }
    const oldEntry = JSON.parse(JSON.stringify(newEntry));
    newEntry.description = description;
    newEntry.amount = amount;
    await this.save();
    app.bot.telegram.sendMessage(this.telegramId, `Changed Entry from ${oldEntry.description}: ${oldEntry.amount}\n` +
      `-> ${newEntry.description}: ${newEntry.amount}\n` +
      `for ${member.name} (${member.id})`);

    return newEntry;
  }

  // @instanceMethod getSummaryTable(this: InstanceType<Group>) {
  //   const sum = this.getSum();
  //   const avg = sum / (this.members as Member[]).length;
  //   const memberSums = this.getMembersWithSums();
  //   const table = new AsciiTable();
  //   table.addRow('sum', sum, ' ');
  //   table.addRow('average', avg, ' ');
  //   memberSums.forEach(member => {
  //     table.addRow(member.name, member.sum, avg - member.sum);
  //   });
  //   // Console.log(table.toString());
  //   return table.toString();
  // }

  @instanceMethod getMemberinfo(this: InstanceType<Group>, memberId: number) {
    const member = this.getMemberById(memberId);
    if (!member) {
      return 'No Info found!';
    }
    const memberSum = member.entries.reduce((acc, entry) => {
      return acc + entry.amount;
    }, 0);
    const sum = this.getSum();
    const avg = sum / (this.members as Member[]).length;

    let str = `${member.name} (${member.id})\n` +
      `member sum: ${memberSum}\ngroup average: ${avg}.\n`;
    str += '<code>';
    const table = new AsciiTable();

    member.entries.forEach(entry => {
      const partialMembers = entry.partialGroupMembers ? entry.partialGroupMembers.map(partialGroupMember => {
        const member = this.members.find(member => member.id == partialGroupMember);
        if (member) {
          return member.name;
        }
      }) : [];
      table
        .addRow(entry.description, partialMembers.join(','), entry.amount);
    });
    str += table.toString();
    str += '</code>';
    return str;
  }
}






export const GroupModel = new Group().getModelForClass(Group);
