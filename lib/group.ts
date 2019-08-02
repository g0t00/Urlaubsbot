// import {Document, Schema, Model, model} from 'mongoose';
import { prop, post, Typegoose, InstanceType, instanceMethod, arrayProp, pre } from 'typegoose';
import { IGroupData, ITransaction, IMember } from './interfaces'
const AsciiTable = require('ascii-table');
import { v1 as uuid } from 'uuid';
import * as _ from 'lodash';
import { Member } from './member';
import { Entry } from './entry';
import { app } from './app';
import {web} from './web';
import {roundToCent} from './util';
import * as moment from 'moment-timezone';
export interface IMemberWithSum extends Member {
  sum: number;
}
import { PaypalMappingModel } from './paypalMapping';

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
  @prop({default: false})
  dayMode: boolean;
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
    let text = entry.description + ': ' + entry.amount + ' ';
    text += 'Members having to pay for this: ';
    if (entry.partialGroupMembers && entry.partialGroupMembers.length > 0) {
       text += entry.partialGroupMembers.map(memberId => {
        const member = this.members.find(member => member.id === memberId);
        if (member) {
          return member.name;
        }
      }).join(', ');
    } else {
      text += 'all';
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
  async evaluate(this: InstanceType<Group>): Promise<IGroupData> {
    const members = this.members.map(member => {
      let hasPayed = 0;
      let toPay = 0;
      for (const entry of member.entries) {
        hasPayed += entry.amount;
      }
      if (this.dayMode === false) {
        for (const memberToPay of this.members) {
          for (const entry of memberToPay.entries) {
            if (!entry.partialGroupMembers || entry.partialGroupMembers.length === 0) {
              toPay += entry.amount / this.members.length;
            } else if (entry.partialGroupMembers.indexOf(member.id) > -1) {
              toPay += entry.amount / entry.partialGroupMembers.length;
            }
          }
        }


      } else {
        for (const memberToPay of this.members) {
          for (const entry of memberToPay.entries) {
            if (!entry.partialGroupMembers || entry.partialGroupMembers.length === 0) {
              // Only Member which dates fit has to Pay
              const days = typeof entry.endTime === 'undefined' ? 1 : Math.max(1, Math.ceil(moment(entry.endTime).diff(moment(entry.time), 'days', true)));
              const perDay = entry.amount / days;
              for (let i = 0; i < days; i++) {
                const currentDay = moment(entry.time).add(i, 'days');
                const membersWhoHaveToPay = this.members.filter(memberFilter => memberFilter.allTime || (memberFilter.start <= currentDay.toDate() && moment(memberFilter.end).endOf('day').toDate() > currentDay.toDate()));
                if (membersWhoHaveToPay.findIndex(memberFind => memberFind.id === member.id) > -1) {
                  toPay += perDay / membersWhoHaveToPay.length;
                }
              }
              // toPay += entry.amount / this.members.filter(memberFilter => memberFilter.allTime || (memberFilter.start < entry.time && memberFilter.end > entry.time)).length;
            } else if (entry.partialGroupMembers.indexOf(member.id) > -1) {
              toPay += entry.amount / entry.partialGroupMembers.length;
            }
          }
        }
      }
      const entries = member.entries.map(entry => {
        const partialGroupMembers = entry.partialGroupMembers ? entry.partialGroupMembers : [];
        return {
          description: entry.description,
          amount: entry.amount,
          time: entry.time,
          endTime: entry.endTime,
          uuid: entry.uuid,
          partialGroupMembers}
          ;
        });
      // const round = (num: number) =>  Math.sign(num) * Math.round(Math.abs(num));

      // hasPayed = round(hasPayed * 100) / 100;
      // toPay = round(toPay * 100) / 100;

      return {
        id: member.id,
        name: member.name,
        start: member.start,
        end: member.end,
        allTime: member.allTime,
        hasPayed,
        toPay,
        entries: entries
      };
    });
    const transactions: ITransaction[] = [];
    let equalized = false;
    interface IMemberWithOpen extends IMember {
      open: number;
    }
    const membersCopy: IMemberWithOpen[]  = JSON.parse(JSON.stringify(members));
    for (const member of membersCopy) {
      member.open = member.hasPayed - member.toPay;
    }
    let overrun = 0;
    while (!equalized && overrun < 100) {
      membersCopy.sort((a, b) => a.open - b.open);
      const from = membersCopy[0];
      const to = membersCopy[membersCopy.length - 1];
      const amount = Math.min(Math.abs(from.open), to.open);
      const mapping = await PaypalMappingModel.findOne({telegramId: to.id});
      const transaction: ITransaction = {
        from: from.name,
        to: to.name,
        amount
      };
      if (mapping) {
        transaction.paypalLink = mapping.link + '/' + roundToCent(amount);
      }
      transactions.push(transaction);
      from.open += amount;
      to.open -= amount;
      equalized = true;
      for (const member of membersCopy) {
        if (member.open > 0.01) {
          equalized = false;
        }
      }
      overrun++;
    }
    if (overrun === 100) {
      console.error(`overrun`);
    }
    return {
      id: this.id,
      name: this.name || '',
      dayMode: this.dayMode,
      members,
      transactions: overrun < 100 ? transactions : []
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
      const entry = member.entries.find(entry => entry.uuid === uuid);
        if (entry) {
          return entry;
        }
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
      await app.bot.telegram.sendMessage(this.telegramId, `Member ${name} added (id: ${id})`);
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

  @instanceMethod async getSummaryTable(this: InstanceType<Group>) {
    const evaluation = await this.evaluate();
    const table = new AsciiTable();
    table.addRow('name', 'has payed', 'has to pay', 'still open')
    evaluation.members.forEach(member => {
      table.addRow(member.name, roundToCent(member.hasPayed), roundToCent(member.toPay), roundToCent(member.toPay - member.hasPayed));
    });
    // Console.log(table.toString());
    return table.toString();
  }

  @instanceMethod async getMemberinfo(this: InstanceType<Group>, memberId: number) {
    const evaluation = await this.evaluate();

    const member = evaluation.members.find(member => member.id === memberId);
    if (!member) {
      return 'No Info found!';
    }
    const memberSum = member.entries.reduce((acc, entry) => {
      return acc + entry.amount;
    }, 0);
    const sum = this.getSum();
    const avg = sum / (this.members as Member[]).length;

    let str = `${member.name} (${member.id})\n` +
      `has payed: ${roundToCent(member.hasPayed)}, has to pay: ${roundToCent(member.toPay)}, still open: ${roundToCent(member.toPay - member.hasPayed)}.\n`;
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
