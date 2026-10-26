import { prop } from '@typegoose/typegoose';
import { ITransaction } from './interfaces';

export class Transaction implements ITransaction {
  @prop()
  public from: string;
  @prop()
  public to: string;
  @prop()
  public toId: number;
  @prop()
  public amount: number;
  @prop()
  public confirmed: boolean;
  @prop()
  public paypalLink?: string;
}
