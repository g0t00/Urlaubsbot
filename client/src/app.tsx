import { createMuiTheme, CssBaseline, FormControlLabel, FormGroup, Paper, Switch, ThemeProvider } from "@material-ui/core";
import * as React from "react";
import { Suspense, useEffect, useState } from 'react';
import Group from "./components/Group";
export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const theme = createMuiTheme({
    palette: { type: darkMode ? 'dark' : 'light', }
  });
  useEffect(() => {
    // Add listener to update styles
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => setDarkMode(e.matches));

    // Setup dark/light mode for the first time
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Remove listener
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => {
      });
    }
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
