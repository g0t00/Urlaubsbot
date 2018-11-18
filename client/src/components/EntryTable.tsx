import { IEntryFlat } from './Group'
import { IGroupData } from '../../../lib/interfaces'

import { Grid, Table, TableHeaderRow, TableEditRow, TableEditColumn,  } from '@devexpress/dx-react-grid-material-ui';
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
import InputLabel from '@material-ui/core/InputLabel';
import Chip from '@material-ui/core/Chip';

export interface IEntryTableProps {
  entries: IEntryFlat[];
  groupData: IGroupData;
}
const DateFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({value}:  {value: Date}) => {
  return <span>{value.toLocaleString().toString()}</span>;
}

const DateTypeProvider: React.ComponentType<DataTypeProviderProps>  = (props: DataTypeProviderProps) => (
  <DataTypeProvider
    formatterComponent={DateFormatter}
    {...props}
  />
);
const PartialGroupFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({value}:  {value: string[]}) => {
  if (value.length === 0) {
    return <span>All</span>;
  }
  return <span>{value.join(', ')}</span>;
}


const NumberEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => (
  <TextField
  value={value}
  onChange={event => onValueChange(event.target.value)}
  type="number"
  />
);
const NumberFormatter: React.ComponentType<DataTypeProvider.ValueFormatterProps> = ({value}:  {value: number}) => {
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

export class EntryTable extends React.Component<IEntryTableProps, {deleteDialogOpen: boolean, deleteDialogEntry: IEntryFlat}> {
  constructor(props: any) {
    super(props);
    this.state = {deleteDialogOpen: false, deleteDialogEntry: null};
    this.commitChanges = this.commitChanges.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.payerEditor = this.payerEditor.bind(this);
    this.payerTypeProvider = this.payerTypeProvider.bind(this);
    this.partialGroupEditor = this.partialGroupEditor.bind(this);

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
            groupId: this.props.groupData.id,
            memberId: member.id,
            description: add.description,
            amount
          };
          await fetch('/group/new-entry', {
            method: 'POST',
            headers: {
              "Content-Type": "application/json; charset=utf-8",
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
        await fetch('/group/' + String(this.props.groupData.id) + '/' + uuid, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
          },
          body: JSON.stringify(changes)
        });
      }
    }
  }

  payerEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => {
    console.log(this, 'propsB');
    return (
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
    )};
  payerTypeProvider: React.ComponentType<DataTypeProviderProps> = props => {
    console.log(this, 'propsA');
    return (
      <DataTypeProvider
      editorComponent={this.payerEditor}
      {...props}
      />
    )};
    partialGroupEditor: React.ComponentType<DataTypeProvider.ValueEditorProps> = ({ value, onValueChange }) => (
      <FormControl>
      <Select
        multiple
        value={value}
        onChange={event => onValueChange(event.target.value)}
        input={<Input id="select-multiple-chip" />}
        renderValue={(selected: number[]) => (
          <div>
            {selected.map((value: number) => (
              <Chip key={value} label={value} />
            ))}
          </div>
        )}
        style={{ width: '100%' }}

      >
        {this.props.groupData.members.map(member => (
          <MenuItem key={member.name} value={member.name}>
            {member.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
  partialGroupProvider: React.ComponentType<DataTypeProviderProps>  = (props: DataTypeProviderProps) => (
    <DataTypeProvider
      formatterComponent={PartialGroupFormatter}
      editorComponent={this.partialGroupEditor}
      {...props}
    />
  );
  async deleteEntry() {
    await fetch(`/group/delete/${this.props.groupData.id}/${this.state.deleteDialogEntry.uuid}`, {
    });
    console.log(this.state.deleteDialogEntry);
    this.setState({deleteDialogOpen: false});
  }
  render() {
    return (
      <>
      <Paper>
      <Grid
        rows= { this.props.entries }
        columns = {
        [
          { name: 'name', title: 'Payer'},
          { name: 'description', title: 'description' },
          { name: 'partialGroupMembers', title: 'for' },
          { name: 'amount', title: 'amount' },
          { name: 'time', title: 'entry date' },
        ]}
        getRowId = {getEntryId}
        >
        <SortingState defaultSorting={ [{ columnName: 'time', direction: 'desc' }] } />
        <IntegratedSorting />
        <EditingState
          columnExtensions = {[
            { columnName: 'time', editingEnabled: false },
          ]}
          onCommitChanges={this.commitChanges}
        />
        <Table />
        <DateTypeProvider for={['time']} />
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
          onClose={() => this.setState({deleteDialogOpen: false})}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Remove Entry?"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
            {this.state.deleteDialogEntry &&
              <><>{this.state.deleteDialogEntry.name}<br/></>
              <>{this.state.deleteDialogEntry.description}<br/></>
              <>{this.state.deleteDialogEntry.amount}<br/></>
              <>{this.state.deleteDialogEntry.partialGroupMembers.join(', ')}<br/></>
              <>{this.state.deleteDialogEntry.time.toLocaleString()}<br/></></>
            }
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.setState({deleteDialogOpen: false})} color="primary">
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
