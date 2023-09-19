export type GroupState = 'initial' | 'readyCheck' | 'transactionCheck' | 'done';
export interface IGroupData {
  members: IMember[];
  name: string;
  id: string;
  dayMode: boolean;
  transactions: ITransaction[];
  state: GroupState;
}
export interface IMember {
  id: number;
  name: string;
  toPay: number;
  hasPayed: number;
  start: Date;
  end: Date;
  allTime: boolean;
  entries: IEntry[];
  readyCheckConfirmed: boolean;
  hasToPayEntries: IPayEntry[];
}
export interface IEntry {
  description: string;
  amount: number;
  partialGroupMembers?: number[];
  time?: Date;
  uuid: string,
}
export interface IPayEntry {
  description: string;
  amount: number;
  partialAmount: number;
}
export interface IGroupMemberChange {
  start?: Date;
  end?: Date;
  allTime?: boolean;
}
export class ITransaction {
  constructor(
    public from: string,
    public to: string,
    public toId: number,
    public amount: number,
    public confirmed: boolean,
    public paypalLink?: string,

  ) {

  }
}
