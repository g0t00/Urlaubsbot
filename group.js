module.exports = class Group {
  constructor(name, id, members = null, sheetId = null, currency = null) {
    this.members = members || [];
    this.id = id;
    this.name = name;
    this.members.forEach(member => {
      if (!member.entries) {
        member.entries = [];
      }
    });
    this.sheetId = sheetId;
    this.currency = currency;
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
      return accMembers + member.entries.reduce((accEntries, entry) => {
        return accEntries + 1;
      }, 0);
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
  getMemberById(id) {
    let membersFiltered = this.members.filter(member => member.id == id);

    return membersFiltered.length == 1 ? membersFiltered[0] : null;
  }
  addMember(name, id, username) {
    let double = false;
    this.members.forEach(member => {
      if (member.id == id) {
        double = true;
      }
    });
    if (double) {
      return false;
    }
    let member = {name, id, entries: []};
    this.members.push(member);
    return true;
  }
  addEntry(memberId, description, amount) {
    let found = false;
    this.members.forEach(member => {
      if (member.id == memberId) {
        member.entries.push({
          description, amount
        });
        found = true;
      }
    });
    return found;
  }
}
