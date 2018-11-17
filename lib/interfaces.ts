export interface IGroupData {
  members: IMember [];
  name: string;
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
  partialGroupMembers?: string[];
  time?: Date;
}
