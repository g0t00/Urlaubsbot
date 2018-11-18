import { IGroupData, IMember, IEntry } from '../../../lib/interfaces'
// import deepcopy from "ts-deepcopy";

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
export class Group extends React.Component<{}, {groupData: IGroupData}> {
  groupId: string;
  constructor(props: any) {
    super(props);
    this.state = {groupData: {name: 'Loading', members: [], id: 0}};
  }
  async loadData() {
    let source = new EventSource('/group/' + this.groupId + '/stream');
    source.onmessage = ({data}) => {
      const json = JSON.parse(data);
      for (const member of json.members) {
        for (const entry of member.entries) {
          entry.time = new Date(entry.time);
        }
      }
      console.log(json, 'eventsource');

      this.setState({
        groupData: json
      })
    };
    // const response = await fetch('/group/' + this.groupId);
    // const json = await response.json();
    // for (const member of json.members) {
    //   for (const entry of member.entries) {
    //     entry.time = new Date(entry.time);
    //   }
    // }
    // this.setState({
    //   groupData: await json as IGroupData
    // });
    // console.log(this.state.groupData);
  }
  componentDidMount () {
    this.groupId = window.location.hash.replace(/^#/, '');
    this.loadData();
  }
  renderMember (member: IMember, i: number) {
    return (
      <Grid item xs={6} sm={6} md={3}  key={i}>
        <Card>
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
      </Grid>
    );
  }
  render() {
    console.log(this.state);
    const entriesFlat: IEntryFlat[] = [];
    for (const member of this.state.groupData.members) {
      for (const entry of member.entries) {
        entriesFlat.push({name: member.name, ... entry});
      }
    }
    return (
      <div>
        <h1>Group {this.state.groupData.name}</h1>
        <Grid container spacing={16}>
        {
          this.state.groupData.members.map((member, i) => this.renderMember(member, i))
        }
        </Grid>
        <br/>
        <Card>
          <EntryTable entries={entriesFlat} groupData={this.state.groupData} />
        </Card>
        <pre>HI{JSON.stringify(this.state.groupData)}</pre>
      </div>
    );
  }
}
