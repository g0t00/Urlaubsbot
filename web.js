const util = require('util');
module.exports = class Web {
  constructor(database) {
    return (req, res) => {
      let id = parseInt(req.params.id, 10);
      let groupObj = database.getGroupById(id);
      res.render('pages/group', {
        group: groupObj,
        debug: JSON.stringify(groupObj)
      });
      // res.send('id: ' + id + ' ' + util.inspect(groupObj));
    };
  }
};
