import { IGroupData, IMember, IEntry } from '../../../lib/interfaces'
import * as React from "react";

import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import Typography from '@material-ui/core/Typography';
import {EntryTable} from './EntryTable';

export enum sortRows {
  description,
  amount,
  time
};
export interface IEntryFlat extends IEntry {
    name: string;
}
export type sortDirection = 'asc' | 'desc';
export class Group extends React.Component<{}, {groupData: IGroupData, direction: sortDirection, sortRow: sortRows}> {
  groupId: string;
  constructor(props: any) {
    super(props);
    this.state = {groupData: {name: 'Loading', members: []}, direction: 'asc', sortRow: sortRows.time};
  }
  async loadData() {
    const response = await fetch('/group/' + this.groupId);
    const json = await response.json();
    for (const member of json.members) {
      for (const entry of member.entries) {
        entry.time = new Date(entry.time);
      }
    }
    this.setState({
      groupData: await json as IGroupData
    });
    console.log(this.state.groupData);
  }
  componentDidMount () {
    this.groupId = window.location.hash.replace(/^#/, '');
    console.log(this.groupId, 'groupId');
    this.loadData();
  }
  sort(entries: IEntry[]) {
    if (this.state.sortRow === sortRows.description) {
      entries.sort((a, b) => a.description.localeCompare(b.description));
    } else if (this.state.sortRow === sortRows.amount) {
      entries.sort((a, b) => a.amount - b.amount);
    } else if (this.state.sortRow === sortRows.time) {
      entries.sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    if (this.state.direction === 'desc') {
      entries.reverse();
    }
  }
  sortHeaderClicked (row: sortRows) {
    if (this.state.sortRow === row) {
      this.setState({direction: this.state.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      this.setState({
        sortRow: row,
        direction: 'asc'
      });
    }
  }
  renderMember (member: IMember, i: number) {
    return (
        <Card key={i}>
          <CardContent>
            <Typography gutterBottom variant="h5" component="h2">
              {member.name}
            </Typography>
            <Table><TableBody>
            <TableRow>
              <TableCell>Has Payed: </TableCell><TableCell>{member.hasPayed}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Has to Payed: </TableCell><TableCell>{member.toPay}</TableCell>
            </TableRow>
            <TableRow className={member.toPay - member.hasPayed > 0 ? 'hasToPay' : 'gets'}>
              <TableCell>{member.toPay - member.hasPayed > 0 ? `Has still to Pay` : 'Gets: '}</TableCell>
              <TableCell className='memberAmount' >{Math.abs(member.toPay - member.hasPayed)}</TableCell>
              </TableRow>
            </TableBody></Table>

          </CardContent>
        </Card>
    );
  }
  render() {
    const entriesFlat: IEntryFlat[] = [];
    for (const member of this.state.groupData.members) {
      for (const entry of member.entries) {
        entriesFlat.push({name: member.name, ... entry});
      }
    }
    this.sort(entriesFlat);
    return (
      <div>
        <h1>Group info!</h1>
        {
          // this.state.groupData.members.map((member, i) => this.renderMember(member, i))
        }
        <br/>
        <Card>
          <EntryTable entries={entriesFlat} />
        </Card>
        <pre>HI{JSON.stringify(this.state.groupData)}</pre>
      </div>
    );
  }
}
