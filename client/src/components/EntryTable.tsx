import { IEntryFlat } from './Group'
import { IGroupData, IMember } from '../interfaces'

import { Grid, Table, TableHeaderRow, TableEditRow, TableEditColumn, } from '@devexpress/dx-react-grid-material-ui';
import {
  SortingState,
  IntegratedSorting,
  ChangeSet,
  EditingState,
} from '@devexpress/dx-react-grid';
import * as React from "react";
import { DataTypeProvider, DataTypeProviderProps } from '@devexpress/dx-react-grid';
import { Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, Select, Input, MenuItem, FormControl, Chip, FormControlLabel, Checkbox, FormGroup } from '@material-ui/core';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';


import { API_BASE, authHeaders } from '../api';
import { useContext, useState } from 'react';
export interface IEntryTableProps {
  entries: IEntryFlat[];
  groupData: IGroupData;
}
const DateFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({ value }: { value: Date }) => {
  if (typeof value !== 'undefined') {
    return <span>{value.toLocaleDateString()}</span>;
  }
  return <span> - </span>;
}
const DateEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange, column }) => (
  <MuiPickersUtilsProvider utils={DateFnsUtils}>
    <DatePicker
      margin="normal"
      label=""
      clearable={column.name === 'endTime'}
      value={value == undefined ? null : value}
      onChange={onValueChange}
    />
  </MuiPickersUtilsProvider>

);
const DateTypeProvider: React.ComponentType<DataTypeProviderProps> = (props: DataTypeProviderProps) => (
  <DataTypeProvider
    formatterComponent={DateFormatter}
    editorComponent={DateEditor}
    {...props}
  />
);
type IErrors = Record<string | number, boolean>;
const EditCell = ({ errors, addedErrors, ...props }: TableEditColumn.CellProps & { errors: IErrors; addedErrors: IErrors }) => {
  const { children } = props;
  const rowId = props.tableRow.rowId ?? '';
  return (
    <TableEditColumn.Cell {...props}>
      {React.Children.map(children, child => (
        React.isValidElement<{ id?: string; disabled?: boolean }>(child) && child.props.id === 'commit'
          ? React.cloneElement(child, { disabled: errors[rowId] || addedErrors[rowId] })
          : child
      ))}

    </TableEditColumn.Cell>
  );
};


const NumberEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => (
  <TextField
    value={value}
    onChange={event => onValueChange(event.target.value)}
    type="number"
  />
);
const NumberFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({ value }: { value: number }) => {
  return <span>{value.toLocaleString()}</span>;
}
const NumberTypeProvider: React.ComponentType<DataTypeProviderProps> = props => (
  <DataTypeProvider
    formatterComponent={NumberFormatter}
    editorComponent={NumberEditor}
    {...props}
  />
);
const getEntryId = (entry: IEntryFlat) => entry.uuid;

const MembersContext = React.createContext<IMember[]>([]);

function PayerEditor({ value, onValueChange }: DataTypeProvider.ValueEditorProps) {
  const members = useContext(MembersContext);
  return (
    <div>
      <Select
        input={<Input />}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        style={{ width: '100%' }}
      >
        {members.map(member => (
          <MenuItem value={member.name} key={member.id}>
            {member.name}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
function PartialGroupFormatter({ value }: DataTypeProvider.ValueFormatterProps) {
  const members = useContext(MembersContext);
  const ids = value as number[];
  if (ids.length === 0) {
    return <span>All</span>;
  }
  const nameOf = (id: number) => members.find(member => member.id === id)?.name ?? '';
  return <span>{ids.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map(nameOf).join(', ')}</span>;
}
function PartialGroupEditor({ value, onValueChange }: DataTypeProvider.ValueEditorProps) {
  const members = useContext(MembersContext);
  return <FormGroup>
    <FormControlLabel
      control={
        <Checkbox
          checked={!value || value.length === 0}
          onChange={event => event.target.value && onValueChange([])}
          value="checkedB"
          color="primary"
        />
      }
      label="All"
    />
    <FormControl>
      <Select
        multiple
        value={value || []}
        onChange={event => onValueChange(event.target.value)}
        input={<Input id="select-multiple-chip" />}
        renderValue={selected => (
          <div>
            {(selected as number[]).map(id => (
              <Chip key={id} label={members.find(member => member.id === id)?.name} />
            ))}
          </div>
        )}
        style={{ width: '100%' }}
      >
        {members.map(member => (
          <MenuItem key={member.id} value={member.id}>
            {member.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </FormGroup>;
}

export function EntryTable(props: IEntryTableProps) {
  const [state, setState] = useState<{ deleteDialogOpen: boolean, deleteDialogEntry?: IEntryFlat }>({
    deleteDialogOpen: false
  });
  const [errors, setErrors] = useState<IErrors>({});
  const [addedErrors, setAddedErrors] = useState<IErrors>({});

  async function commitChanges({ added, changed, deleted }: ChangeSet) {
    if (deleted && deleted[0]) {
      const entry = props.entries.find(entry => entry.uuid === deleted[0]);
      setState({
        deleteDialogOpen: true,
        deleteDialogEntry: entry
      });
    }
    if (added) {
      for (const add of added) {

        const amount = parseFloat(add.amount);
        if (add.name !== '' && Number.isFinite(amount)) {
          const member = props.groupData.members.find(member => member.name === add.name);
          if (!member) {
            continue;
          }

          const body = {
            memberId: member.id,
            description: add.description,
            partialGroupMembers: add.partialGroupMembers,
            time: add.time,
            endTime: add.endTime,
            amount
          };
          await fetch(API_BASE + '/' + props.groupData.id, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              ...authHeaders(),
              // "Content-Type": "application/x-www-form-urlencoded",
            },
            body: JSON.stringify(body)
          });

        }
      }
      console.log(added, 'added');
    }
    if (changed) {
      for (const uuid of Object.keys(changed)) {
        const changes = changed[uuid];
        await fetch(API_BASE + '/' + String(props.groupData.id) + '/' + uuid, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...authHeaders(),
            // "Content-Type": "application/x-www-form-urlencoded",
          },
          body: JSON.stringify(changes)
        });
      }
    }
  }
  async function deleteEntry() {
    if (!state.deleteDialogEntry) {
      return;
    }
    await fetch(API_BASE + `/${props.groupData.id}/${state.deleteDialogEntry.uuid}`, { method: 'DELETE', headers: authHeaders() });
    console.log(state.deleteDialogEntry);
    setState({ ...state, deleteDialogOpen: false });
  }
  return <>
    <MembersContext.Provider value={props.groupData.members}>
      <Paper>
        <Grid
          rows={props.entries}
          columns={
            [
              { name: 'name', title: 'Payer' },
              { name: 'description', title: 'Description' },
              { name: 'partialGroupMembers', title: 'For' },
              { name: 'amount', title: 'Amount' },
              { name: 'time', title: 'Entry/Start date' },
              { name: 'endTime', title: 'End Date' },
            ]}
          getRowId={getEntryId}
        >
          <SortingState defaultSorting={[{ columnName: 'time', direction: 'desc' }]} />
          <IntegratedSorting />
          <EditingState
            onRowChangesChange={rowChanges => {
              const errors = Object.entries(rowChanges).reduce(
                (acc, [rowId, row]) => {
                  return {
                    ...acc,
                    [rowId]: row.name === '' || row.amount === '' || row.description === '',
                  }
                }, {});
              console.log('c', errors);
              setErrors(errors)
            }}

            onAddedRowsChange={addedRows => {
              const errors = Object.entries(addedRows).reduce(
                (acc, [rowId, row]) => {
                  return {
                    ...acc,
                    [rowId]: typeof row.name !== 'string' || row.name === '' || typeof row.amount !== 'string' ||
                      row.amount === '' || typeof row.description !== 'string' || row.description === '' || typeof row.name !== 'string' || row.name === '',
                  }
                }, {});
              console.log('a', errors);
              setAddedErrors(errors)
            }}
            columnExtensions={[
              // { columnName: 'time', editingEnabled: false },
            ]}
            onCommitChanges={commitChanges}
          />
          <Table />
          <DateTypeProvider for={['time']} />
          <DateTypeProvider for={['endTime']} />
          <NumberTypeProvider for={['amount']} />
          <DataTypeProvider
            for={['partialGroupMembers']}
            formatterComponent={PartialGroupFormatter}
            editorComponent={PartialGroupEditor}
          />
          <DataTypeProvider for={['name']} editorComponent={PayerEditor} />

          <TableHeaderRow showSortingControls />
          <TableEditRow />
          <TableEditColumn
            showAddCommand={props.groupData !== undefined && (props.groupData.state === 'initial' || props.groupData.state === 'readyCheck')}
            showEditCommand={props.groupData !== undefined && (props.groupData.state === 'initial' || props.groupData.state === 'readyCheck')}
            showDeleteCommand={props.groupData !== undefined && (props.groupData.state === 'initial' || props.groupData.state === 'readyCheck')}
            cellComponent={props => <EditCell {...props} errors={errors} addedErrors={addedErrors}/>}
          />
        </Grid>
      </Paper>
    </MembersContext.Provider>
    <Dialog
      open={state.deleteDialogOpen}
      onClose={() => setState({ deleteDialogOpen: false })}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Remove Entry?"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {state.deleteDialogEntry &&
            <><>{state.deleteDialogEntry.name}<br /></>
              <>{state.deleteDialogEntry.description}<br /></>
              <>{state.deleteDialogEntry.amount}<br /></>
              <>{state.deleteDialogEntry.partialGroupMembers?.join(', ')}<br /></>
              <>{state.deleteDialogEntry.time?.toLocaleString()}<br /></></>
          }
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setState({ deleteDialogOpen: false })} color="primary">
          Cancel
        </Button>
        <Button onClick={deleteEntry} color="primary" autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
