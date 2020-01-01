import { useState } from "react";
import React from "react";
import { IGroupData, IMember, IEntry, IGroupMemberChange } from '../../../lib/interfaces'

import Plot from "react-plotly.js";

export function PlotWrapper({groupData}: {groupData: IGroupData}) {
    const [showPlot, setShowPlot] = useState(true);
    
    return <Plot
        data={[
          {type: 'pie', 
          values: groupData.members.map(member => member.hasPayed),
          labels: groupData.members.map(member => member.name),
          textinfo: 'value+percent'
        },
        ]}
        layout={ {width: 640, height: 640, title: 'Has Payed'} }
      />;
}