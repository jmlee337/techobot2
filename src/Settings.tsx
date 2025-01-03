import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import TwitchSettings from './SettingsTwitch';

export default function Settings() {
  const [version, setVersion] = useState('');
  useEffect(() => {
    const inner = async () => {
      const versionPromise = window.electron.getVersion();
      setVersion(await versionPromise);
    };
    inner();
  }, []);

  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
        variant="contained"
      >
        Settings
      </Button>
      <Dialog
        open={open}
        onClose={async () => {
          setOpen(false);
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          marginRight="24px"
        >
          <DialogTitle>Settings</DialogTitle>
          <Typography variant="caption">Techobot2 version {version}</Typography>
        </Stack>
        <DialogContent>
          <TwitchSettings version={version} />
        </DialogContent>
      </Dialog>
    </>
  );
}
