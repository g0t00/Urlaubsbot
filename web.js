const express = require('express');
const Sheet = require('./sheet');

module.exports = class Web {
  constructor(database) {
    const router = express.Router(); // eslint-disable-line new-cap
    router.get('/:id', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const groupObj = database.getGroupById(id);
      const members = groupObj.members.map(member => Object.assign({}, member));
      const groupAvg = groupObj.getSum() / groupObj.members.length;
      members.forEach(member => {
        member.memberSum = member.entries.reduce((acc, add) => acc + add.amount, 0).toFixed(2);
        member.toPay = (groupAvg - member.memberSum).toFixed(2);
      });
      try {
        res.render('pages/group', {
          group: groupObj,
          members,
          debugInfo: JSON.stringify(members, null, 2)
        });
      } catch (e) {
        console.error(e);
      }
    });
    router.get('/delete/:groupId/:entryUuid', (req, res) => {
      const groupId = parseInt(req.params.groupId, 10);
      const groupObj = database.getGroupById(groupId);
      if (groupObj === null) {
        return res.send('Group not found!');
      }
      if (groupObj.deleteEntryByUuid(req.params.entryUuid)) {
        database.save();
        return res.redirect('/group/' + groupId);
      }
      res.send('Error while deleting');
    });
    router.get('/sheet-export/:groupId', async (req, res) => {
      const groupId = parseInt(req.params.groupId, 10);
      const groupObj = database.getGroupById(groupId);
      if (groupObj === null) {
        return res.send('Group not found!');
      }
      try {
        await Sheet.export(groupObj);
        return res.send('ok');
      } catch (e) {
        console.error(e);
        res.status(500).send(e.message);
      }
    });
    router.post('/new-entry', async (req, res) => {
      let {id, memberId, description = '', amount = ''} = req.body;
      id = parseInt(id, 10);
      amount = parseFloat(amount.replace(',', '.'));
      if (description === '') {
        description = 'no description';
      }
      const groupObj = database.getGroupById(id);
      if (groupObj === null) {
        return res.send('Group not found/no Group ID transmitted!');
      }
      if (isNaN(amount)) {
        return res.send('Invalid amount tramsitted!');
      }
      if (groupObj.addEntry(memberId, description, amount)) {
        database.save();
        console.log('saved');
        return res.redirect('/group/' + id);
      }
      res.send('Error while adding');
    });
    router.post('/edit', async (req, res) => {
      let {id, memberId, uuid, description, amount} = req.body;
      id = parseInt(id, 10);
      amount = parseFloat(String(amount).replace(',', '.'), 10);
      const groupObj = database.getGroupById(id);
      if (groupObj === null || typeof groupObj === 'undefined') {
        return res.send('Group not found/no Group ID transmitted!');
      }
      groupObj.editEntry(memberId, uuid, {description, amount});
      database.save();
      console.log(req.body);
      database.save();
      res.send('ok');
    });
    return router;
  }
};
