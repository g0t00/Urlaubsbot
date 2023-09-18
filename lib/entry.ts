import { prop } from '@typegoose/typegoose';
export class Entry {
  @prop({ required: true })
  uuid: string;
  @prop({ required: true })
  description: string;
  @prop({ required: true })
  amount: number;
  @prop({ required: true })
  time: Date;
  @prop()
  endTime?: Date;
  @prop({
    type: Number,
  })
  partialGroupMembers: number[];

}
