export interface IGroupData {
  members: IMember [];
  name: string;
  id: number;
}
export interface IMember {
  id: number;
  name: string;
  toPay: number;
  hasPayed: number;
  entries: IEntry[];
}
export interface IEntry {
  description: string;
  amount: number;
  partialGroupMembers?: number[];
  time?: Date;
  uuid: string,
}
