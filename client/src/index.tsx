import * as React from "react";
import * as ReactDOM from "react-dom";
import 'typeface-roboto';

import { Group } from "./components/Group";
import CssBaseline from '@material-ui/core/CssBaseline';
//    //
ReactDOM.render(
  <React.Fragment>
    <CssBaseline />
    <Group/>
  </React.Fragment>,
  document.getElementById("example")
);
