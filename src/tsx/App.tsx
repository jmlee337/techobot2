import { AppBar, Grid2, Stack, Toolbar, Typography } from '@mui/material';
import Settings from './Settings';
import ManualRoll from './ManualRoll';
import { useEffect, useState } from 'react';
import Greetings from './Greetings';
import ManualChaos from './ManualChaos';
import Tally from './Tally';
import Quest from './Quest';

export default function App() {
  const [version, setVersion] = useState('');
  useEffect(() => {
    window.electron.getVersion().then(setVersion);
  }, []);

  return (
    <>
      <AppBar position="sticky">
        <Toolbar
          disableGutters
          style={{ paddingLeft: '8px', paddingRight: '8px' }}
        >
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            techobot2
          </Typography>
          <Typography variant="caption">version {version}</Typography>
        </Toolbar>
      </AppBar>
      <Grid2 container padding="8px 0" spacing={2}>
        <Grid2 size={4}>
          <Stack spacing="8px">
            <Quest />
            <ManualRoll />
            <ManualChaos />
            <Greetings />
            <Tally />
          </Stack>
        </Grid2>
        <Grid2 size={8}>
          <Settings />
        </Grid2>
      </Grid2>
    </>
  );
}
