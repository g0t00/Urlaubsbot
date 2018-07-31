const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const CircularJSON = require('circular-json');
const Group = require('./group');

const parseObjectReplaceGroupObj = (obj, telegram) => {
  if (obj.groups && obj.groups.map) {
    obj.groups = obj.groups.map(group => {
      return new Group(group, telegram);
    });
    return obj;
  }
  return obj;
};
const serializer = obj => {
  const objClone = CircularJSON.parse(CircularJSON.stringify(obj));

  if (objClone.groups && objClone.groups.map) {
    objClone.groups = objClone.groups.map(group => {
      const newObj = {};
      Object.keys(group).forEach(key => {
        if (key !== 'telegram') {
          newObj[key] = group[key];
        }
      });
      return newObj;
    });
    return objClone;
  }
  return objClone;
};
module.exports = class Database {
  constructor(telegram) {
    const adapter = new FileSync('db.blub', {
      serialize: array => JSON.stringify(serializer(array), null, 2),
      deserialize: string => parseObjectReplaceGroupObj(JSON.parse(string || {}), telegram)
    });
    this.db = low(adapter);
    this.db.defaults({groups: []})
      .write();
  }

  newGroup(group) {
    // Console.log(group, 'newGroup');
    this.db.get('groups').push(group).write();
  }

  getGroupById(id) {
    const group = this.db.get('groups').find({id}).value();
    return group;
  }

  save() {
    this.db.write();
  }
};
