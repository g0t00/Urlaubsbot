// import {Document, Schema, Model, model} from 'mongoose';
import { prop, post, Typegoose, InstanceType, instanceMethod, arrayProp, pre } from 'typegoose';
import * as moment from 'moment-timezone';
export class PaypalMapping extends Typegoose {
  @prop({ required: true, index: true })
  telegramId: number;
  @prop({required: true})
  link: string;
}






export const PaypalMappingModel = new PaypalMapping().getModelForClass(PaypalMapping);
