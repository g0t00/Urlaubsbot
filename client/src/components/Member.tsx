import { IGroupData, IMember } from '../interfaces';
import { roundToCent } from '../util';
import * as React from "react";
import { Box, Button, Card, Input, Modal } from '@material-ui/core';
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
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const groupWeight = groupData.members.reduce((p, c) => p + c.weight, 0);
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };
  return <Grid item xs={12} sm={6} md={3} key={i}>
    <Card>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          {member.name}
        </Typography>
        <Table><TableBody>
          <TableRow>
            <TableCell>Weight<br />
              <Modal open={open} onClose={handleClose}><Box css={style}>
                e.g. weight 2 has to pay the same as 2 persons (with weight = 1).
                <br />Is ignored for Entries that a "for" particular members
                Total weight in group: {groupWeight}<br />
                So this member pays {roundToCent(member.weight / groupWeight * 100)}%.
              </Box></Modal>
              <Button onClick={handleOpen}>Info</Button>
            </TableCell>
            <TableCell><Input type="number" value={member.weight} step="any" min="0"
              onChange={event => valueChanged(member.id, groupId, { weight: parseFloat(event.target.value.replace(",", ".")) })}
            /></TableCell>
          </TableRow>
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
