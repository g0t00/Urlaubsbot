import { prop, Typegoose, arrayProp } from 'typegoose';

import {Entry} from './entry';
export class Member extends Typegoose {
  @arrayProp({items: Entry, default: []})
  entries: Entry[] = [];
  @prop({required: true})
  name: string;
  @prop({required: true})
  id: number;
};
