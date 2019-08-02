import { prop, Typegoose, arrayProp } from 'typegoose';
import * as moment from 'moment-timezone';
;
import {Entry} from './entry';
export class Member extends Typegoose {
  @arrayProp({items: Entry, default: []})
  entries: Entry[] = [];
  @prop({required: true})
  name: string;
  @prop({required: true})
  id: number;
  @prop({default: new Date()})
  start: Date;

  @prop({default: new Date()})
  end: Date;
  @prop({default: true})
  allTime: boolean;
};
