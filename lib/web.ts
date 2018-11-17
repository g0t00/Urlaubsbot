const crypto = require('crypto');
import * as express from 'express';
import { app } from './app';
import { GroupModel } from './group';
export class Web {
  router: express.Router;
  constructor() {
    this.router = express.Router(); // eslint-disable-line new-cap
    this.router.get('/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const groupObj = await GroupModel.findById(id).exec();
      if (!groupObj) {
        res.status(404);
        res.send('not found');
        return;
      }
      const evaluation = groupObj.evaluate();
      res.json(evaluation);
    });
    this.router.get('/delete/:groupId/:entryUuid', async (req, res) => {
      const groupId = parseInt(req.params.groupId, 10);
      const groupObj = await GroupModel.findById(groupId);
      if (groupObj === null) {
        return res.send('GroupModel not found!');
      }
      if (await groupObj.deleteEntryByUuid(req.params.entryUuid)) {
        return res.redirect('/group/' + groupId);
      }
      res.send('Error while deleting');
    });
    // this.router.get('/sheet-export/:groupId', async (req, res) => {
    //   const groupId = parseInt(req.params.groupId, 10);
    //   const groupObj = database.getGroupById(groupId);
    //   if (groupObj === null) {
    //     return res.send('GroupModel not found!');
    //   }
    //   try {
    //     await Sheet.export(groupObj);
    //     return res.send('ok');
    //   } catch (e) {
    //     console.error(e);
    //     res.status(500).send(e.message);
    //   }
    // });
    this.router.post('/new-entry', async (req, res) => {
      let {id, memberId, description = '', amount = ''} = req.body;
      id = parseInt(id, 10);
      amount = parseFloat(amount.replace(',', '.'));
      if (description === '') {
        description = 'no description';
      }
      const groupObj = await GroupModel.findById(id);
      if (groupObj === null) {
        return res.send('GroupModel not found/no GroupModel ID transmitted!');
      }
      if (isNaN(amount)) {
        return res.send('Invalid amount tramsitted!');
      }
      if (await groupObj.addEntry(memberId, description, amount)) {
        console.log('saved');
        return res.redirect('/group/' + id);
      }
      res.send('Error while adding');
    });
    this.router.post('/edit', async (req, res) => {
      let {id, memberId, uuid, description, amount, user} = req.body;
      const chat = await app.bot.telegram.getChat(memberId);
      console.log(chat, (app.bot.telegram as any).token);
      const authData: any[] = [];
      Object.keys(user).sort((a, b) => a > b ? 1 : -1).forEach(key => {
        if (key !== 'hash') {
          authData.push(key + '=' + user[key]);
        }
      });
      const dataCheckString = authData.join('\n');
      const hash = crypto.createHash('sha256');
      hash.update((app.bot.telegram as any).token);
      const secretKey = hash.digest('latin1');
      const hmac = crypto.createHmac('sha256', secretKey);
      hmac.update(dataCheckString);
      const hashCompare = hmac.digest('hex');

      console.log(hashCompare, dataCheckString);
      amount = parseFloat(String(amount).replace(',', '.'));
      const groupObj = await GroupModel.findById(id);
      if (groupObj === null || typeof groupObj === 'undefined') {
        return res.send('Group not found/no Group ID transmitted!');
      }
      await groupObj.editEntry(memberId, uuid, description, amount);
      res.send('ok');
    });
  }
};
