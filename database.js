const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Group = require('./group');

const parseObjectReplaceGroupObj = obj => {
  if (obj.groups && obj.groups.map) {
    obj.groups = obj.groups.map(group => {
      return new Group(group.name, group.id, group.members, group.sheetId, group.currency);
    });
    return obj;
  }
  return obj;
};

const adapter = new FileSync('db.blub', {
  serialize: array => JSON.stringify(array, null, 2),
  deserialize: string => parseObjectReplaceGroupObj(JSON.parse(string || {}))
});
const db = low(adapter);

module.exports = class Database {
  constructor() {
    db.defaults({groups: []})
      .write();
  }

  newGroup(group) {
    // Console.log(group, 'newGroup');
    db.get('groups').push(group).write();
  }

  getGroupById(id) {
    const group = db.get('groups').find({id}).value();
    return group;
  }

  save() {
    db.write();
  }
};
