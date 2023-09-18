import { prop } from '@typegoose/typegoose';
import { Entry } from './entry';
;
export class Member {
  @prop({ type: Entry, default: [] })
  entries: Entry[] = [];
  @prop({ required: true })
  name: string;
  @prop({ required: true })
  id: number;
  @prop({ default: new Date() })
  start: Date;

  @prop({ default: new Date() })
  end: Date;
  @prop({ default: true })
  allTime: boolean;
  @prop({ default: false })
  readyCheckConfirmed: boolean;
};
