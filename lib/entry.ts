import { prop, Typegoose, arrayProp } from 'typegoose';
export class Entry extends Typegoose {
  @prop({required: true})
  uuid: string;
  @prop({required: true})
  description: string;
  @prop({required: true})
  amount: number;
  @prop()
  time?: Date;
  @arrayProp({
    items: Number
  })
  partialGroupMembers?: number[];

}
