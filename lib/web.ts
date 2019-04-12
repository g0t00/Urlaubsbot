import {createHash, createHmac} from 'crypto';
import * as express from 'express';
import { app } from './app';
import { GroupModel } from './group';
import * as EventEmitter from 'events';
import {Entry} from './entry';
export class Web {
  router: express.Router;
  emitter = new EventEmitter();
  async authorize(req: any, res: any, next: () => void) {
    let user: any;
    try {
      user = JSON.parse(req.get('Auth') || req.query.auth);

    } catch(e) {
      res.send('no login found');
      console.log('no login found');

      return res.status(403).end();
    }
    if (!user) {
      console.log('no login found');

      return res.sendStatus(403).end();
    }
    const authData: any[] = [];
    const {hash, ...data} = user;
    const checkString = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n')

    const token = (app.bot.telegram as any).token;
    const secret = createHash('sha256')
    .update(token)
    .digest();
    const hmac = createHmac('sha256', secret)
    .update(checkString);
    const hashCompare = hmac.digest('hex');
    // console.log((app.bot.telegram as any).token);
    // console.log(checkString);
    // console.log(hash, hashCompare);
    if (hash !== hashCompare) {
      res.send('wrong login');
      return res.status(403).end();
    }
    const id = req.params.id;
    const groupObj = await GroupModel.findById(id).exec();
    if (!groupObj || !groupObj.members.find(member => member.id === data.id)) {
      console.log(id, req.params);
      res.send('user not in group');
      return res.status(403).end();
    }
    next();
  }
  constructor() {
    this.router = express.Router();
    this.router.get('/:id/stream', this.authorize, async (req, res) => {
      const id = req.params.id;
      const groupObj = await GroupModel.findById(id).exec();
      if (!groupObj) {
        res.status(404);
        res.send('not found');
        return;
      }
      res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       'Connection': 'keep-alive'
     });
     const evaluation = groupObj.evaluate();
     res.write("data: " + JSON.stringify(evaluation) + "\n\n");
     const handler = async () => {
       const groupObj = await GroupModel.findById(id).exec();
       if (!groupObj) {
         return;
       }
       const evaluation = groupObj.evaluate();
       res.write("data: " + JSON.stringify(evaluation) + "\n\n");
     };
     this.emitter.on(id, handler);
     setTimeout(() => {
       this.emitter.removeListener(id, handler);
       res.end();
     }, 60000);
    });

    this.router.get('/:id', this.authorize, async (req, res) => {
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
    this.router.put('/:id/:entryUuid', this.authorize, async (req, res) => {
      console.log(req.body);
      const id = req.params.id;
      console.log(id);
      const groupObj = await GroupModel.findById(id).exec();
      if (!groupObj) {
        res.status(404);
        res.send('did not find group ' + id);
        return;
      }
      const entry: any = await groupObj.findEntryByUuid(req.params.entryUuid);

      if (!entry) {
        res.status(404);
        res.send('did not find entry ' + req.params.entryUuid);
        return;
      }
      const oldEntry: any = {description: entry.description, amount: entry.amount, partialGroupMembers: entry.partialGroupMembers};
      const oldOwner = groupObj.members.find(member => typeof member.entries.find(entrySearch => entrySearch.uuid === entry.uuid) !== 'undefined');
      // const oldEntry: any = {descrip...entry};
      for (const key of Object.keys(req.body)) {
        if (key === 'name') {
          const targetMember = groupObj.members.find(member => member.name === req.body[key]);
          for (const member of groupObj.members) {
            const index = member.entries.findIndex(entrySearch => entrySearch.uuid === entry.uuid);
            if (targetMember && index > -1) {
              member.entries.splice(index, 1);
              targetMember.entries.push(entry);
            }
          }
        }  else {
          entry[key] = req.body[key];
        }
      }
      try {
        await groupObj.save();
        const parseEntry = (entry: Entry) => {
          const partialGroupNames = [];
          for (const partialGroupMember of (entry.partialGroupMembers || [])) {
            const member = groupObj.members.find(member => member.id == partialGroupMember);
            if (member) {
              partialGroupNames.push(member.name);
            } else {
              partialGroupNames.push('???');
            }
          }
          return `${entry.description} ${entry.amount} ${(entry.partialGroupMembers && entry.partialGroupMembers.length > 0) ? partialGroupNames.join(',') : 'all'}`;
        }
        const newOwner = groupObj.members.find(member => typeof member.entries.find(entrySearch => entrySearch.uuid === entry.uuid) !== 'undefined');

        await app.bot.telegram.sendMessage(groupObj.telegramId, `Changed Entry: ${oldOwner && oldOwner.name}: (${parseEntry(oldEntry)}) -> ${newOwner && newOwner.name}: (${parseEntry(entry)})`);

        return res.json(true);
      } catch(e) {
        console.error(e);
        res.status(500);
        return res.json(false);
      }
    });
    this.router.delete('/:groupId/:entryUuid', this.authorize, async (req, res) => {
      const groupId = req.params.groupId;
      const groupObj = await GroupModel.findById(groupId);
      if (!groupObj) {
        return res.send('GroupModel not found!');
      }
      if (await groupObj.deleteEntryByUuid(req.params.entryUuid)) {
        const parseEntry = (entry: Entry) => {
          const partialGroupNames = [];
          for (const partialGroupMember of (entry.partialGroupMembers || [])) {
            const member = groupObj.members.find(member => member.id == partialGroupMember);
            if (member) {
              partialGroupNames.push(member.name);
            } else {
              partialGroupNames.push('???');
            }
          }
        }
        return res.json(true);
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
    this.router.post('/:id', this.authorize, async (req, res) => {
      const groupId = req.params.id;
      let {memberId, description = '', amount = '', partialGroupMembers = []} = req.body;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(',', '.'));

      }
      if (description === '') {
        description = 'no description';
      }
      const groupObj = await GroupModel.findById(groupId);
      if (groupObj === null) {
        res.status(500);
        return res.send('GroupModel not found/no GroupModel ID transmitted!');
      }
      if (!Number.isFinite(amount)) {
        res.status(500);
        return res.send('Invalid amount tramsitted!');
      }
      if (await groupObj.addEntry(memberId, description, amount, partialGroupMembers)) {
        res.status(200);
        return res.json(true);
      }
      res.send('Error while adding');
    });
  }
};
export const web = new Web();
