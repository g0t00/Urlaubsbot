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
}
export interface IEntry {
  description: string;
  amount: number;
  partialGroupMembers?: number[];
  time?: Date;
  uuid: string,
}
export interface IGroupMemberChange {
  start?: Date;
  end?: Date;
  allTime?: boolean;
}
export interface ITransaction {
  from: string,
  to: string;
  toId: number;
  amount: number;
  paypalLink?: string;
  confirmed: boolean;
}
