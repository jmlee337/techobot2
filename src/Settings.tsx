import { Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function Settings() {
  const [twitchChannel, setTwitchChannel] = useState('');
  const [version, setVersion] = useState('');
  const [gotSettings, setGotSettings] = useState(false);
  useEffect(() => {
    const inner = async () => {
      const twitchChannelPromise = window.electron.getTwitchChannel();
      const versionPromise = window.electron.getVersion();

      setTwitchChannel(await twitchChannelPromise);
      setVersion(await versionPromise);

      setGotSettings(true);
    }
    inner();
  }, []);

  const [open, setOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  if (
    gotSettings &&
    !hasAutoOpened &&
    !twitchChannel
  ) {
    setOpen(true);
    setHasAutoOpened(true);
  }

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
          await window.electron.setTwitchChannel(twitchChannel)
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
          <Typography variant="caption">
            Techobot2 version {version}
          </Typography>
        </Stack>
        <DialogContent>
          <TextField
            label="Twitch channel"
            onChange={(event) => {
              setTwitchChannel(event.target.value);
            }}
            size="small"
            value={twitchChannel}
            variant="filled"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
