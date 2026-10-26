// import {Document, Schema, Model, model} from 'mongoose';
import { getModelForClass, prop } from '@typegoose/typegoose';
export class PaypalMapping {
  @prop({ required: true, index: true })
  telegramId!: number;
  @prop({required: true})
  link!: string;
}






export const PaypalMappingModel = getModelForClass(PaypalMapping);
