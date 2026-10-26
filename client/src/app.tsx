import { createMuiTheme, CssBaseline, FormControlLabel, FormGroup, Paper, Switch, ThemeProvider } from "@material-ui/core";
import * as React from "react";
import { useEffect, useState } from 'react';
import Group from "./components/Group";
export function App() {
  const [darkMode, setDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const theme = createMuiTheme({
    palette: { type: darkMode ? 'dark' : 'light', }
  });
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Paper style={{ height: '100vh' }}>
      <FormGroup>
        <FormControlLabel control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />} label="Dark Mode" />
      </FormGroup>
        <Group />
    </Paper>
  </ThemeProvider>
};
