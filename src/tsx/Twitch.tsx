import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import {
  TwitchCallbackServerStatus,
  TwitchSettings,
  TwitchChatClientStatus,
} from '../types';

export default function Twitch({ version }: { version: string }) {
  const [callbackServerStatus, setCallbackServerStatus] = useState(
    TwitchCallbackServerStatus.STOPPED,
  );
  const [port, setPort] = useState(0);
  const [chatClientStatus, setChatClientStatus] = useState(
    TwitchChatClientStatus.DISCONNECTED,
  );
  const [settings, setSettings] = useState<TwitchSettings>({
    channel: '',
    clientId: '',
    clientSecret: '',
  });

  const [channel, setChannel] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const inner = async () => {
      const callbackServerStatusPromise =
        window.electron.getTwitchCallbackServerStatus();
      const chatClientStatusPromise =
        window.electron.getTwitchChatClientStatus();
      const settingsPromise = window.electron.getTwitchSettings();
      const initialCallbackServerStatus = await callbackServerStatusPromise;
      setCallbackServerStatus(initialCallbackServerStatus.status);
      setPort(initialCallbackServerStatus.port);
      setChatClientStatus(await chatClientStatusPromise);
      const initialSettings = await settingsPromise;
      setSettings(initialSettings);
      setChannel(initialSettings.channel);
      setClientId(initialSettings.clientId);
      setClientSecret(initialSettings.clientSecret);
    };
    inner();
  }, []);
  useEffect(() => {
    window.electron.onTwitchCallbackServerStatus(
      (event, newCallbackServerStatus, newPort) => {
        setCallbackServerStatus(newCallbackServerStatus);
        setPort(newPort);
        if (newCallbackServerStatus === TwitchCallbackServerStatus.STOPPED) {
          setOpen(false);
        }
      },
    );
    window.electron.onTwitchChatClientStatus((event, newChatClientStatus) => {
      setChatClientStatus(newChatClientStatus);
    });
  }, []);

  const [abortOpen, setAbortOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const callbackUrl = `http://localhost:${port}`;

  return (
    <Stack alignItems="center" direction="row" spacing="8px">
      <Button
        onClick={() => {
          window.electron.startTwitchCallbackServer();
          setChannel(settings.channel);
          setClientId(settings.clientId);
          setClientSecret(settings.clientSecret);
          setOpen(true);
        }}
        variant="contained"
      >
        {!channel || !clientId || !clientSecret ? 'SET UP' : 'CHANGE'}
      </Button>
      <DialogContentText>
        Twitch Bot:{' '}
        {chatClientStatus === TwitchChatClientStatus.DISCONNECTED &&
          'DISCONNECTED'}
        {chatClientStatus === TwitchChatClientStatus.CONNECTING &&
          'CONNECTING...'}
        {chatClientStatus === TwitchChatClientStatus.CONNECTED && 'CONNECTED'}
      </DialogContentText>
      <Dialog
        open={open}
        onClose={() => {
          if (
            channel !== settings.channel ||
            clientId !== settings.clientId ||
            clientSecret !== settings.clientSecret
          ) {
            setAbortOpen(true);
          } else {
            window.electron.stopTwitchCallbackServer();
          }
        }}
      >
        <DialogContent>
          <Stack spacing="8px">
            <DialogContentText>
              Create an application from the{' '}
              <a
                href="https://dev.twitch.tv/console/apps"
                target="_blank"
                rel="noreferrer"
              >
                Twitch Developer Console
              </a>
              , using the following OAuth Redirect URL:
            </DialogContentText>
            <Stack alignItems="center" direction="row" spacing="8px">
              <DialogContentText>{callbackUrl}</DialogContentText>
              <Button
                disabled={port === 0}
                endIcon={
                  port === 0 ? (
                    <CircularProgress size="24px" />
                  ) : (
                    <ContentCopy />
                  )
                }
                onClick={() => {
                  navigator.clipboard.writeText(callbackUrl);
                  setCopied(true);
                  setTimeout(() => {
                    setCopied(false);
                  }, 5000);
                }}
                variant="contained"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Stack>
            <DialogContentText>
              See example screenshots{' '}
              <a
                href={`https://github.com/jmlee337/techobot2/blob/${version}/src/docs/twitch.md`}
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
              .
            </DialogContentText>
            <TextField
              label="Twitch channel"
              onChange={(event) => {
                setChannel(event.target.value);
              }}
              size="small"
              value={channel}
              variant="filled"
            />
            <TextField
              label="Client ID"
              onChange={(event) => {
                setClientId(event.target.value);
              }}
              size="small"
              value={clientId}
              variant="filled"
            />
            <TextField
              label="Client Secret"
              onChange={(event) => {
                setClientSecret(event.target.value);
              }}
              size="small"
              type="password"
              value={clientSecret}
              variant="filled"
            />
            <Button
              disabled={
                !channel ||
                !clientId ||
                !clientSecret ||
                callbackServerStatus !== TwitchCallbackServerStatus.STARTED
              }
              endIcon={
                callbackServerStatus === TwitchCallbackServerStatus.STARTING ? (
                  <CircularProgress size="24px" />
                ) : undefined
              }
              onClick={async () => {
                await window.electron.setTwitchSettings({
                  channel,
                  clientId,
                  clientSecret,
                });
                setSettings({
                  channel,
                  clientId,
                  clientSecret,
                });
              }}
              variant="contained"
            >
              {callbackServerStatus === TwitchCallbackServerStatus.STOPPED &&
                'Error!'}
              {callbackServerStatus === TwitchCallbackServerStatus.STARTING &&
                'Loading'}
              {callbackServerStatus === TwitchCallbackServerStatus.STARTED &&
                'Save & Go!'}
            </Button>
            <Dialog open={abortOpen}>
              <DialogTitle>Abort Twitch Bot Setup?</DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => {
                    setAbortOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setAbortOpen(false);
                    window.electron.stopTwitchCallbackServer();
                  }}
                >
                  Abort
                </Button>
              </DialogActions>
            </Dialog>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
