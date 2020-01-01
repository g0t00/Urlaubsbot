import * as React from "react";
import { IGroupData, IMember, IEntry, IGroupMemberChange } from '../../../lib/interfaces'

import Plot from "react-plotly.js";
interface IProps {
  groupData: IGroupData
};
interface IState {
  showPlot: boolean;
}
export class PlotWrapper extends React.Component<IProps, IState> {
  constructor(p: IProps) {
    super(p);
    this.state = {
      showPlot: false
    };
  }
  
  render() {
    const entries = this.props.groupData.members.map((member, index) => member.entries).flat();
    const entriesTargets = [];
    const label = this.props.groupData.members.map(member => member.name).concat([""]);
    for (const entry of entries) {
      entriesTargets.push(label.push(entry.description) - 1);
    }
    const colors = ["rgb(31, 119, 180)", "rgb(255, 127, 14)", "rgb(44, 160, 44)", "rgb(148, 103, 189)", "rgb(140, 86, 75)", "rgb(227, 119, 194)", "rgb(127, 127, 127)", "rgb(188, 189, 34)", "rgb(23, 190, 207)", "rgb(31, 119, 180)", "rgb(255, 127, 14)", "rgb(214, 39, 40)", "rgb(148, 103, 189)", "rgb(140, 86, 75)", "rgb(227, 119, 194)", "rgb(127, 127, 127)", "rgb(188, 189, 34)"];
    const data = [
      {
        type: "sankey",
        orientation: "h",
        node: {
          pad: 15,
          thickness: 30,
          line: {
            color: "black",
            width: 0.5
          },
         label,
         color: colors.slice(0, this.props.groupData.members.length + 1).concat(this.props.groupData.members.map((member, index) => member.entries.map(entry => colors[index])).flat())
            },
      
        link: {
          source: [...Array(this.props.groupData.members.length).keys()].concat(Array(entriesTargets.length).fill(this.props.groupData.members.length)),
          target: Array(this.props.groupData.members.length).fill((this.props.groupData.members.length)).concat(entriesTargets),
          value:  this.props.groupData.members.map(member => member.hasPayed).concat(entries.map(entry => entry.amount))
        }
      },
    ] as any;
    console.log(data);
    
    
    var layout = {
      title: "Basic Sankey",
      font: {
        size: 10
      }
    }
    // if (this.state.showPlot) {
    return <div>
      <Plot
        data={data}
        layout={{ width: 640, height: 640, title: 'Has Payed' }}
      />
    </div>;


    // }
    // return <div>YOLO</div>;
  }

}