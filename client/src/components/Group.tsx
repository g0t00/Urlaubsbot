import { IGroupData, IMember, IEntry, IGroupMemberChange } from '../../../lib/interfaces'
import {roundToCent} from '../../../lib/util';
// import deepcopy from "ts-deepcopy";

import * as React from "react";

import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import Typography from '@material-ui/core/Typography';
import {EntryTable} from './EntryTable';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import { MuiPickersUtilsProvider, TimePicker, DatePicker } from 'material-ui-pickers';
import MomentUtils from '@date-io/moment';

import {API_BASE} from '../api';
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
    this.state = {groupData: {name: 'Loading. Are you logged in?', members: [], id: 0, dayMode: false, transactions: []}};
  }
  async loadData() {
    let source = new EventSource(API_BASE + '/' + this.groupId + '/stream?auth=' + localStorage.getItem('user'));
    source.onmessage = ({data}) => {
      const json = JSON.parse(data);
      for (const member of json.members) {
        for (const entry of member.entries) {
          entry.time = new Date(entry.time);
          if (typeof entry.endTime !== 'undefined') {
            entry.endTime = new Date(entry.endTime);
          }
        }
      }
      console.log(json, 'eventsource');

      this.setState({
        groupData: json
      })
    };
    source.onerror = (evt) => {
      console.log(evt, 'event');
    }
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
  async valueChanged(memberId: number, change: any) {
    if (change.start) {
      change.start = change.start.startOf('day');
    }
    await fetch(API_BASE + '/' + String(this.state.groupData.id) + '/member/' + String(memberId), {
      method: 'POST',
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Auth": localStorage.getItem('user')
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      body: JSON.stringify(change)
    });
    console.log(memberId, change);
  }
  renderMember (member: IMember, i: number) {
    return (
      <Grid item xs={12} sm={6} md={3}  key={i}>
        <Card>
          <CardContent>
            <Typography gutterBottom variant="h5" component="h2">
              {member.name}
            </Typography>
            <Table><TableBody>
            {this.state.groupData.dayMode && <>
              <TableRow>
                <TableCell colSpan={2}><FormControlLabel
                  control={
                    <Checkbox
                      checked={member.allTime}
                      onChange={event => this.valueChanged(member.id, {allTime: event.target.checked})}
                      value="DayMode"
                      color="primary"
                    />
                  }
                  label="all time"
                />
                </TableCell>
              </TableRow>
              {member.allTime === false &&
                <>
              <TableRow>
                <TableCell>start: </TableCell><TableCell>

                <MuiPickersUtilsProvider utils={MomentUtils}>
                          <DatePicker
                            margin="normal"
                            label=""
                            value={member.start}
                            onChange={event => this.valueChanged(member.id, {start: event})}
                          />
                      </MuiPickersUtilsProvider>
                  </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>end: </TableCell>
                <TableCell><MuiPickersUtilsProvider utils={MomentUtils}>
                          <DatePicker
                            margin="normal"
                            label=""
                            value={member.end}
                            onChange={event => this.valueChanged(member.id, {end: event})}
                          />
                      </MuiPickersUtilsProvider></TableCell>
            </TableRow></>}</>
          }
            <TableRow>
              <TableCell>Has Payed: </TableCell><TableCell>{roundToCent(member.hasPayed)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Has to Pay: </TableCell><TableCell>{roundToCent(member.toPay)}</TableCell>
            </TableRow>
            <TableRow className={member.toPay - member.hasPayed > 0 ? 'hasToPay' : 'gets'}>
              <TableCell>{member.toPay - member.hasPayed > 0 ? `Has still to Pay` : 'Gets: '}</TableCell>
              <TableCell className='memberAmount' >{Math.abs(roundToCent(member.toPay - member.hasPayed))}</TableCell>
              </TableRow>
            </TableBody></Table>

          </CardContent>
        </Card>
      </Grid>
    );
  }
  async changeDayMode(event: any) {
    await fetch(API_BASE + '/' + String(this.state.groupData.id) + '/dayMode', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Auth": localStorage.getItem('user')
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      body: JSON.stringify({dayMode: event.target.checked})
    });
  }
  render() {
    console.log(this.state);
    const entriesFlat: IEntryFlat[] = [];
    for (const member of this.state.groupData.members) {
      for (const entry of member.entries) {
        entriesFlat.push({name: member.name, ... entry});
      }
    }
    // <pre>HI{JSON.stringify(this.state.groupData)}</pre>
    return (
      <div>
        <h1>Group {this.state.groupData.name}</h1>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.groupData.dayMode}
                onChange={(event) => this.changeDayMode(event)}
                value="DayMode"
                color="primary"
              />
            }
            label="Day Mode"
          />
        </FormGroup>
        <Grid container spacing={16}>
        {
          this.state.groupData.members.map((member, i) => this.renderMember(member, i))
        }
        </Grid>
        <br/>
        <Card>
          <EntryTable entries={entriesFlat} groupData={this.state.groupData} />
        </Card>
        <br/>
        <Card>
        <CardContent>
        <Typography gutterBottom variant="h5" component="h2">Transaction to Equalize</Typography>
            <Table>
            <TableHead>
                <TableRow>
                <TableCell>
                From
                </TableCell>
                <TableCell>
                To
                </TableCell>
                <TableCell>
                Amount
                </TableCell>
                <TableCell>
                Paypal
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.state.groupData.transactions.map(transaction =>
                <TableRow>
                  <TableCell>
                    {transaction.from}
                  </TableCell>
                  <TableCell>
                    {transaction.to}
                  </TableCell>
                  <TableCell>
                    {Math.round(transaction.amount * 100) / 100}
                  </TableCell>
                  <TableCell>
                    {transaction.paypalLink &&<a href={transaction.paypalLink}>Pay</a>}
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
            </CardContent>
        </Card>
      </div>
    );
  }
}
