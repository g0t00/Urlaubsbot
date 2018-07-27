const util = require('util');
module.exports = class Web {
  constructor(database) {
    return (req, res) => {
      let id = parseInt(req.params.id, 10);
      let groupObj = database.getGroupById(id);
      let members = groupObj.members.map(member => Object.assign({}, member));
      let groupAvg = groupObj.getSum() / groupObj.members.length;
      members.forEach(member => {
        member.memberSum = member.entries.reduce((acc, add) => acc + add.amount, 0).toFixed(2);
        member.toPay = (groupAvg - member.memberSum).toFixed(2);
      });
      res.render('pages/group', {
        group: groupObj,
        members,
        debug: JSON.stringify(groupObj, null, 2) + JSON.stringify(members, null, 2)
      });
      // res.send('id: ' + id + ' ' + util.inspect(groupObj));
    };
  }
};
