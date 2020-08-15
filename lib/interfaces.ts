export interface IGroupData {
  members: IMember[];
  name: string;
  id: string;
  dayMode: boolean;
  transactions: ITransaction[];
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
  amount: number;
  paypalLink?: string;
}
