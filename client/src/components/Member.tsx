import { IGroupData, IMember } from '../interfaces';
import { roundToCent } from '../util';
import * as React from "react";
import { Card } from '@material-ui/core';
import { CardContent } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import { Table } from '@material-ui/core';
import { TableCell } from '@material-ui/core';
import { TableRow } from '@material-ui/core';
import { TableBody } from '@material-ui/core';
import { Typography } from '@material-ui/core';
import { FormControlLabel } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { valueChanged } from './Group';

export function Member({ member, i, groupId, groupData }: { member: IMember; i: number; groupId: string; groupData?: IGroupData; }) {
  return <Grid item xs={12} sm={6} md={3} key={i}>
    <Card>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          {member.name}
        </Typography>
        <Table><TableBody>
          {groupData.dayMode && <>
            <TableRow>
              <TableCell colSpan={2}><FormControlLabel
                control={<Checkbox
                  checked={member.allTime}
                  onChange={event => valueChanged(member.id, groupId, { allTime: event.target.checked })}
                  value="DayMode"
                  color="primary" />}
                label="all time" />
              </TableCell>
            </TableRow>
            {member.allTime === false &&
              <>
                <TableRow>
                  <TableCell>start: </TableCell><TableCell>

                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <DatePicker
                        margin="normal"
                        label=""
                        value={member.start}
                        onChange={event => valueChanged(member.id, groupId, { start: event })} />
                    </MuiPickersUtilsProvider>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>end: </TableCell>
                  <TableCell><MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <DatePicker
                      margin="normal"
                      label=""
                      value={member.end}
                      onChange={event => valueChanged(member.id, groupId, { end: event })} />
                  </MuiPickersUtilsProvider></TableCell>
                </TableRow></>}</>}
          <TableRow>
            <TableCell>Has Payed: </TableCell><TableCell>{roundToCent(member.hasPayed)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Has to Pay: </TableCell><TableCell>{roundToCent(member.toPay)}</TableCell>
          </TableRow>
          <TableRow className={member.toPay - member.hasPayed > 0 ? 'hasToPay' : 'gets'}>
            <TableCell>{member.toPay - member.hasPayed > 0 ? `Has still to Pay` : 'Gets: '}</TableCell>
            <TableCell className='memberAmount'>{Math.abs(roundToCent(member.toPay - member.hasPayed))}</TableCell>
          </TableRow>
          {groupData?.state === 'readyCheck' &&
            <TableRow>
              <TableCell>Ready Confirmed: </TableCell>
              <TableCell>
                {member.readyCheckConfirmed ? `✅` : `🔳`}
              </TableCell>
            </TableRow>}
        </TableBody></Table>

      </CardContent>
    </Card>
  </Grid>;
}
