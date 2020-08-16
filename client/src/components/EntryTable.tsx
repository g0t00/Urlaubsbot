import { IEntryFlat } from './Group'
import { IGroupData } from '../interfaces'

import { Grid, Table, TableHeaderRow, TableEditRow, TableEditColumn, } from '@devexpress/dx-react-grid-material-ui';
import {
  SortingState,
  IntegratedSorting,
  ChangeSet,
  EditingState
} from '@devexpress/dx-react-grid';
import * as React from "react";
import Paper from '@material-ui/core/Paper';
import { DataTypeProvider, DataTypeProviderProps } from '@devexpress/dx-react-grid';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Chip from '@material-ui/core/Chip';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';


import { API_BASE } from '../api';
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
  <MuiPickersUtilsProvider utils={MomentUtils}>
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

export class EntryTable extends React.Component<IEntryTableProps, { deleteDialogOpen: boolean, deleteDialogEntry: IEntryFlat }> {
  constructor(props: any) {
    super(props);
    this.state = { deleteDialogOpen: false, deleteDialogEntry: null };
    this.commitChanges = this.commitChanges.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.payerEditor = this.payerEditor.bind(this);
    this.payerTypeProvider = this.payerTypeProvider.bind(this);
    this.partialGroupEditor = this.partialGroupEditor.bind(this);
    this.partialGroupFormatter = this.partialGroupFormatter.bind(this);

  }
  async commitChanges({ added, changed, deleted }: ChangeSet) {
    console.log(added, changed, deleted);
    if (deleted && deleted[0]) {
      const entry = this.props.entries.find(entry => entry.uuid === deleted[0]);
      this.setState({
        deleteDialogOpen: true,
        deleteDialogEntry: entry
      });
    }
    if (added) {
      for (const add of added) {

        const amount = parseFloat(add.amount);
        if (add.name !== '' && Number.isFinite(amount)) {
          const member = this.props.groupData.members.find(member => member.name === add.name);

          const body = {
            memberId: member.id,
            description: add.description,
            partialGroupMembers: add.partialGroupMembers,
            time: add.time,
            endTime: add.endTime,
            amount
          };
          await fetch(API_BASE + '/' + this.props.groupData.id, {
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
        await fetch(API_BASE + '/' + String(this.props.groupData.id) + '/' + uuid, {
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

  payerEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => {
    return (
      <div>

        <Select
          input={<Input />}
          value={value}
          onChange={event => onValueChange(event.target.value)}
          style={{ width: '100%' }}
        >
          {this.props.groupData.members.map(member => (
            <MenuItem value={member.name} key={member.id}>
              {member.name}
            </MenuItem>
          ))}
        </Select>
      </div>
    )
  };
  payerTypeProvider: React.ComponentType<DataTypeProviderProps> = props => {
    return (
      <DataTypeProvider
        editorComponent={this.payerEditor}
        {...props}
      />
    )
  };
  partialGroupFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({ value }: { value: number[] }) => {
    if (value.length === 0) {
      return <span>All</span>;
    }
    const valueSort = value.slice().sort((a, b) => (this.props.groupData.members.find(member => member.id === a)?.name ?? '').localeCompare(this.props.groupData.members.find(member => member.id === b)?.name));
    return <span>{value.map(partialGroupMemberId => this.props.groupData.members.find(member => member.id === partialGroupMemberId).name).join(', ')}</span>;
  }
  partialGroupEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => (
    <FormGroup>
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
                const name = this.props.groupData.members.find(member => member.id === value).name;
                return <Chip key={value} label={name} />
              })}
            </div>
          )}
          style={{ width: '100%' }}

        >
          {this.props.groupData.members.map(member => (
            <MenuItem key={member.id} value={member.id}>
              {member.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FormGroup>
  );
  partialGroupProvider: React.ComponentType<DataTypeProviderProps> = (props: DataTypeProviderProps) => (
    <DataTypeProvider
      formatterComponent={this.partialGroupFormatter}
      editorComponent={this.partialGroupEditor}
      {...props}
    />
  );
  async deleteEntry() {
    await fetch(API_BASE + `/${this.props.groupData.id}/${this.state.deleteDialogEntry.uuid}`, { method: 'DELETE', headers: { "Auth": localStorage.getItem('user') } });
    console.log(this.state.deleteDialogEntry);
    this.setState({ deleteDialogOpen: false });
  }
  render() {
    return (
      <>
        <Paper>
          <Grid
            rows={this.props.entries}
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
              columnExtensions={[
                // { columnName: 'time', editingEnabled: false },
              ]}
              onCommitChanges={this.commitChanges}
            />
            <Table />
            <DateTypeProvider for={['time']} />
            <DateTypeProvider for={['endTime']} />
            <NumberTypeProvider for={['amount']} />
            <this.partialGroupProvider
              for={['partialGroupMembers']}
            />
            <this.payerTypeProvider
              for={['name']}
            />

            <TableHeaderRow showSortingControls />
            <TableEditRow />
            <TableEditColumn
              showAddCommand
              showEditCommand
              showDeleteCommand
            />
          </Grid>
        </Paper>
        <Dialog
          open={this.state.deleteDialogOpen}
          onClose={() => this.setState({ deleteDialogOpen: false })}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Remove Entry?"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {this.state.deleteDialogEntry &&
                <><>{this.state.deleteDialogEntry.name}<br /></>
                  <>{this.state.deleteDialogEntry.description}<br /></>
                  <>{this.state.deleteDialogEntry.amount}<br /></>
                  <>{this.state.deleteDialogEntry.partialGroupMembers.join(', ')}<br /></>
                  <>{this.state.deleteDialogEntry.time.toLocaleString()}<br /></></>
              }
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.setState({ deleteDialogOpen: false })} color="primary">
              Cancel
            </Button>
            <Button onClick={this.deleteEntry} color="primary" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}
