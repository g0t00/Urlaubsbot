const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const lodashId = require('lodash-id')
const Group = require('./group');

let parseObjectReplaceGroupObj = (obj) => {
  console.log(obj, 'obj')
  if (obj.groups && obj.groups.map) {
     obj.groups = obj.groups.map(group => {
      return new Group(group.name, group.id, group.members, group.sheetId);
    })
    return obj;
  } else {
    return obj;
  }
}

const adapter = new FileSync('db.blub', {
  serialize: (array) => JSON.stringify(array, null, 2),
  deserialize: (string) => parseObjectReplaceGroupObj(JSON.parse(string || {}))
});
const db = low(adapter)
// db._.mixin(lodashId)

module.exports = class Database {
  constructor() {

    db.defaults({groups: []})
      .write();
  }
  newGroup(group) {
    console.log(group, 'newGroup');
    db.get('groups').push(group).write();
  }
  getGroupById(id) {
    let group = db.get('groups').find({id}).value();
    console.log(group, 'getGroupById');
    return group;
  }
  save() {
    db.write();
  }
}
