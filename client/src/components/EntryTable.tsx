import { IEntryFlat } from './Group'
import { Grid, Table, TableHeaderRow } from '@devexpress/dx-react-grid-material-ui';
import {
  SortingState,
  IntegratedSorting,
} from '@devexpress/dx-react-grid';
import * as React from "react";
import Paper from '@material-ui/core/Paper';
import { DataTypeProvider, DataTypeProviderProps } from '@devexpress/dx-react-grid';

export interface IEntryTableProps {
  entries: IEntryFlat[];
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
  return <span>{value.join(', ')}</span>;
}

const PartialGroupProvider: React.ComponentType<DataTypeProviderProps>  = (props: DataTypeProviderProps) => (
  <PartialGroupProvider
    formatterComponent={PartialGroupFormatter}
    {...props}
  />
);
export class EntryTable extends React.Component<IEntryTableProps, {}> {
  // <PartialGroupProvider
  //     for={['partialGroupMembers']}
  //   />
  render() {
    return (
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
        >
        <SortingState defaultSorting={ [{ columnName: 'description', direction: 'asc' }] } />
        <IntegratedSorting />
        <Table />
        <DateTypeProvider
            for={['time']}
          />

        <TableHeaderRow showSortingControls />
      </Grid>
    </Paper>
    );
  }
}
