import { IGroupData, IMember, IEntry, IGroupMemberChange } from '../interfaces'
import { roundToCent } from '../util';
// import deepcopy from "ts-deepcopy";

import * as React from "react";
import { useEffect, useState, Suspense} from "react";

import { Card } from '@material-ui/core';
import { CardContent } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import { Table } from '@material-ui/core';
import { TableCell } from '@material-ui/core';
import { TableRow } from '@material-ui/core';
import { TableHead } from '@material-ui/core';
import { TableBody } from '@material-ui/core';
import { Typography } from '@material-ui/core';
import { EntryTable } from './EntryTable';
import { FormControlLabel } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
const PlotWrapper = React.lazy(() => import('./PlotWrapper'));
import { API_BASE } from '../api';
import { AppBar, Tabs, Tab } from '@material-ui/core';
export enum sortRows {
  description,
  amount,
  time
};
function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <div >{children}</div>}
    </Typography>
  );
}


export interface IEntryFlat extends IEntry {
  name: string;
}
async function valueChanged(memberId: number, groupId: string, change: any) {
  if (change.start) {
    change.start = change.start.startOf('day');
  }
  await fetch(API_BASE + '/' + groupId + '/member/' + String(memberId), {
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
export function Member({ member, i, dayMode, groupId }: { member: IMember, i: number, dayMode: boolean, groupId: string }) {
  return <Grid item xs={12} sm={6} md={3} key={i}>
    <Card>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          {member.name}
        </Typography>
        <Table><TableBody>
          {dayMode && <>
            <TableRow>
              <TableCell colSpan={2}><FormControlLabel
                control={
                  <Checkbox
                    checked={member.allTime}
                    onChange={event => valueChanged(member.id, groupId, { allTime: event.target.checked })}
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
                        onChange={event => valueChanged(member.id, groupId, { start: event })}
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
                      onChange={event => valueChanged(member.id, groupId, { end: event })}
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
  </Grid>;
}

export default function Group() {
  const [groupData, setGroupData] = useState<IGroupData>({ name: 'Loading. Are you logged in?', members: [], id: '', dayMode: false, transactions: [] });
  const [tab, setTab] = useState(0);
  const [groupId, setGroupId] = useState<string>();
  useEffect(() => {
    setGroupId(window.location.hash.replace(/^#/, ''));
    // groupId = window.location.hash.replace(/^#/, '');
    // loadData();
  }, []);
  useEffect(() => {
    if (typeof groupId !== 'undefined') {
      let source = new EventSource(API_BASE + '/' + groupId + '/stream?auth=' + localStorage.getItem('user'));
      source.onmessage = ({ data }) => {
        const json = JSON.parse(data);
        for (const member of json.members) {
          for (const entry of member.entries) {
            entry.time = new Date(entry.time);
            if (typeof entry.endTime !== 'undefined') {
              entry.endTime = new Date(entry.endTime);
            }
          }
        }

        setGroupData(json)
      };
      source.onerror = (evt) => {
        console.log(evt, 'event');
      }
      return () => {
        source.close();
      }
    }

  }, [groupId])
  async function changeDayMode(event: any) {
    await fetch(API_BASE + '/' + String(groupData.id) + '/dayMode', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Auth": localStorage.getItem('user')
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      body: JSON.stringify({ dayMode: event.target.checked })
    });
  }




  const entriesFlat: IEntryFlat[] = [];
  for (const member of groupData.members) {
    for (const entry of member.entries) {
      entriesFlat.push({ name: member.name, ...entry });
    }
  }
  // <pre>HI{JSON.stringify(groupData)}</pre>
  return (
    <div>
      <h1>Group {groupData.name}</h1>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              checked={groupData.dayMode}
              onChange={(event) => changeDayMode(event)}
              value="DayMode"
              color="primary"
            />
          }
          label="Day Mode"
        />
      </FormGroup>
      <AppBar position="static">
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} aria-label="simple tabs example">
          <Tab label="Summary" />
          <Tab label="Plots" />
        </Tabs>
      </AppBar>
      <TabPanel value={tab} index={0}>
        <Grid container spacing={10}>
          {groupData.members.map((member, i) => <Member member={member} i={i} groupId={groupId} dayMode={groupData.dayMode} />)}
        </Grid>
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <Suspense fallback={<div>Loading...</div>}>
          <PlotWrapper groupData={groupData} />
        </Suspense>
      </TabPanel>

      <br />
      <Card>
        <EntryTable entries={entriesFlat} groupData={groupData} />
      </Card>
      <br />
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
              {groupData.transactions.map(transaction =>
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
                    {transaction.paypalLink && <a href={transaction.paypalLink}>Pay</a>}
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
