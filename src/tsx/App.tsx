import { AppBar, Stack, Toolbar, Typography } from '@mui/material';
import Settings from './Settings';
import ManualRoll from './ManualRoll';

export default function App() {
  return (
    <>
      <AppBar position="sticky">
        <Toolbar disableGutters style={{ paddingLeft: '8px' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            techobot2
          </Typography>
          <Settings />
        </Toolbar>
      </AppBar>
      <Stack padding="8px" spacing="8px">
        <ManualRoll />
      </Stack>
    </>
  );
}
