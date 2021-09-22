import { IEntryFlat } from './Group'
import { IGroupData } from '../interfaces'

import { Grid, Table, TableHeaderRow, TableEditRow, TableEditColumn, } from '@devexpress/dx-react-grid-material-ui';
import {
  SortingState,
  IntegratedSorting,
  ChangeSet,
  EditingState,
  TableRow,
  TableColumn
} from '@devexpress/dx-react-grid';
import * as React from "react";
import { DataTypeProvider, DataTypeProviderProps } from '@devexpress/dx-react-grid';
import { Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, Select, Input, MenuItem, FormControl, Chip, FormControlLabel, Checkbox, FormGroup } from '@material-ui/core';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';


import { API_BASE } from '../api';
import { useState } from 'react';
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
      value={value}
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
interface IErrors {
  [key: string]: boolean;
}
const EditCell = ({ errors, addedErrors, ...props }: any) => {
  const { children } = props;
  console.log(props, 'p');
  return (
    <TableEditColumn.Cell {...props}>
      {React.Children.map(children, child => (
        child?.props.id === 'commit'
          ? React.cloneElement(child, { disabled: errors[props.tableRow.rowId] || addedErrors[props.tableRow.rowId] })
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

export function EntryTable(props: IEntryTableProps) {
  const [state, setState] = useState<{ deleteDialogOpen: boolean, deleteDialogEntry?: IEntryFlat }>({
    deleteDialogOpen: false
  });
  const [errors, setErrors] = useState({});
  const [addedErrors, setAddedErrors] = useState({});

  async function commitChanges({ added, changed, deleted }: ChangeSet) {
    console.log(added, changed, deleted);
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
              "Auth": localStorage.getItem('user')
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
            "Auth": localStorage.getItem('user')
            // "Content-Type": "application/x-www-form-urlencoded",
          },
          body: JSON.stringify(changes)
        });
      }
    }
  }
  //React.ComponentType<DataTypeProvider.ValueEditorProps>
  function payerEditor({ value, onValueChange }: DataTypeProvider.ValueEditorProps) {
    return (
      <div>

        <Select
          input={<Input />}
          value={value}
          onChange={event => onValueChange(event.target.value)}
          style={{ width: '100%' }}
        >
          {props.groupData.members.map(member => (
            <MenuItem value={member.name} key={member.id}>
              {member.name}
            </MenuItem>
          ))}
        </Select>
      </div>
    )
  };
  function PayerTypeProvider(props: DataTypeProviderProps) {
    return (
      <DataTypeProvider
        editorComponent={payerEditor}
        {...props}
      />
    )
  };
  function partialGroupFormatter({ value }: { value: number[] }) {
    if (value.length === 0) {
      return <span>All</span>;
    }
    const valueSort = value.slice().sort((a, b) => (props.groupData.members.find(member => member.id === a)?.name ?? '').localeCompare(props.groupData.members.find(member => member.id === b)?.name));
    return <span>{valueSort.map(partialGroupMemberId => props.groupData.members.find(member => member.id === partialGroupMemberId).name).join(', ')}</span>;
  }
  function partialGroupEditor({ value, onValueChange }: DataTypeProvider.ValueEditorProps) {
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
          renderValue={(selected: number[]) => (
            <div>
              {selected.map((value: number) => {
                const name = props.groupData.members.find(member => member.id === value).name;
                return <Chip key={value} label={name} />
              })}
            </div>
          )}
          style={{ width: '100%' }}

        >
          {props.groupData.members.map(member => (
            <MenuItem key={member.id} value={member.id}>
              {member.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FormGroup>
  };
  function PartialGroupProvider(props: DataTypeProviderProps) {
    return <DataTypeProvider
      formatterComponent={partialGroupFormatter}
      editorComponent={partialGroupEditor}
      {...props}
    />
  };
  async function deleteEntry() {
    await fetch(API_BASE + `/${props.groupData.id}/${state.deleteDialogEntry.uuid}`, { method: 'DELETE', headers: { "Auth": localStorage.getItem('user') } });
    console.log(state.deleteDialogEntry);
    setState({ ...state, deleteDialogOpen: false });
  }
  console.log('asd1')
  return <>
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
        <PartialGroupProvider
          for={['partialGroupMembers']}
        />
        <PayerTypeProvider
          for={['name']}
        />

        <TableHeaderRow showSortingControls />
        <TableEditRow />
        <TableEditColumn
          showAddCommand
          showEditCommand
          showDeleteCommand
          cellComponent={props => <EditCell {...props} errors={errors} addedErrors={addedErrors}/>}
        />
      </Grid>
    </Paper>
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
              <>{state.deleteDialogEntry.partialGroupMembers.join(', ')}<br /></>
              <>{state.deleteDialogEntry.time.toLocaleString()}<br /></></>
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
