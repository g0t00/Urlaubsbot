import * as React from "react";
import * as ReactDOM from "react-dom";

import { Group } from "./components/Group";
import { TestGrid } from "./components/TestGrid";
import CssBaseline from '@material-ui/core/CssBaseline';
//    //

// <TestGrid />
ReactDOM.render(
  <React.Fragment>
    <CssBaseline />
    <Group/>
    </React.Fragment>,
    document.getElementById("example")
);
