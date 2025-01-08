import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, Close, ContentCopy } from '@mui/icons-material';
import {
  TwitchCallbackServerStatus,
  TwitchClient,
  TwitchConnection,
  TwitchConnectionStatus,
} from '../types';

function SetupDialog({
  connection,
  client,
  callbackServerStatus,
  callbackUrl,
  port,
  open,
  setClient,
}: {
  connection: TwitchConnection;
  client: TwitchClient;
  callbackServerStatus: TwitchCallbackServerStatus;
  callbackUrl: string;
  port: number;
  open: boolean;
  setClient: (twitchClient: TwitchClient) => Promise<void>;
}) {
  const [lastOpen, setLastOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  useEffect(() => {
    if (open && !lastOpen) {
      setLastOpen(true);
      setClientId(client.clientId);
      setClientSecret(client.clientSecret);
      window.electron.startTwitchCallbackServer(connection);
    } else {
      setLastOpen(false);
    }
  }, [client, open]);

  const [abortOpen, setAbortOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (
          clientId !== client.clientId ||
          clientSecret !== client.clientSecret
        ) {
          setAbortOpen(true);
        } else {
          window.electron.stopTwitchCallbackServer();
        }
      }}
    >
      <DialogTitle>
        Twitch {connection === TwitchConnection.BOT && 'Bot'}
        {connection === TwitchConnection.CHANNEL && 'Channel'} Setup
      </DialogTitle>
      <DialogContent>
        <Stack spacing="8px">
          <DialogContentText>
            Create an application from the{' '}
            <Link
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noreferrer"
            >
              Twitch Developer Console
            </Link>
            , using the following OAuth Redirect URL:
          </DialogContentText>
          <Stack alignItems="center" direction="row" spacing="8px">
            <DialogContentText>{callbackUrl}</DialogContentText>
            <Button
              disabled={port === 0}
              endIcon={
                port === 0 ? <CircularProgress size="24px" /> : <ContentCopy />
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
            <Link
              href={`https://github.com/jmlee337/techobot2/blob/src/docs/twitch.md`}
              target="_blank"
              rel="noreferrer"
            >
              here
            </Link>
            .
          </DialogContentText>
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
              setClient({
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
            <DialogTitle>
              Abort Twitch {connection === TwitchConnection.BOT && 'Bot'}
              {connection === TwitchConnection.CHANNEL && 'Channel'} Setup?
            </DialogTitle>
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
  );
}

export default function Twitch() {
  const [channel, setChannel] = useState('');
  const [botUserName, setBotUserName] = useState('');
  const [callbackServerStatus, setCallbackServerStatus] = useState(
    TwitchCallbackServerStatus.STOPPED,
  );
  const [port, setPort] = useState(0);
  const [botStatus, setBotStatus] = useState(
    TwitchConnectionStatus.DISCONNECTED,
  );
  const [botStatusMessage, setBotStatusMessage] = useState('');
  const [channelStatus, setChannelStatus] = useState(
    TwitchConnectionStatus.DISCONNECTED,
  );
  const [channelStatusMessage, setChannelStatusMessage] = useState('');
  const [botClient, setBotClient] = useState<TwitchClient>({
    clientId: '',
    clientSecret: '',
  });
  const [channelClient, setChannelClient] = useState<TwitchClient>({
    clientId: '',
    clientSecret: '',
  });

  const [botOpen, setBotOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  useEffect(() => {
    const inner = async () => {
      const callbackServerStatusPromise =
        window.electron.getTwitchCallbackServerStatus();
      const botStatusPromise = window.electron.getTwitchBotStatus();
      const channelStatusPromise = window.electron.getTwitchChannelStatus();
      const botClientPromise = window.electron.getTwitchBotClient();
      const channelClientPromise = window.electron.getTwitchChannelClient();
      const botUserNamePromise = window.electron.getTwitchBotUserName();
      const channelPromise = window.electron.getTwitchChannel();

      const initialCallbackServerStatus = await callbackServerStatusPromise;
      setCallbackServerStatus(initialCallbackServerStatus.status);
      setPort(initialCallbackServerStatus.port);

      const initialBotStatus = await botStatusPromise;
      setBotStatus(initialBotStatus.status);
      setBotStatusMessage(initialBotStatus.message);

      const initialChannelStatus = await channelStatusPromise;
      setChannelStatus(initialChannelStatus.status);
      setChannelStatusMessage(initialChannelStatus.message);

      const initialBotClient = await botClientPromise;
      setBotClient(initialBotClient);

      const initialChannelClient = await channelClientPromise;
      setChannelClient(initialChannelClient);

      setBotUserName(await botUserNamePromise);
      setChannel(await channelPromise);
    };
    inner();
  }, []);
  useEffect(() => {
    window.electron.onTwitchCallbackServerStatus(
      (event, newCallbackServerStatus, newPort) => {
        setCallbackServerStatus(newCallbackServerStatus);
        setPort(newPort);
        if (newCallbackServerStatus === TwitchCallbackServerStatus.STOPPED) {
          setBotOpen(false);
          setChannelOpen(false);
        }
      },
    );
    window.electron.onTwitchBotStatus(
      (event, newBotStatus, newBotStatusMessage) => {
        setBotStatus(newBotStatus);
        setBotStatusMessage(newBotStatusMessage);
      },
    );
    window.electron.onTwitchChannelStatus(
      (event, newChannelStatus, newChannelStatusMessage) => {
        setChannelStatus(newChannelStatus);
        setChannelStatusMessage(newChannelStatusMessage);
      },
    );
    window.electron.onTwitchBotUserName((event, newBotUserName) => {
      setBotUserName(newBotUserName);
    });
    window.electron.onTwitchChannel((event, newChannel) => {
      setChannel(newChannel);
    });
  }, []);

  const callbackUrl = `http://localhost:${port}`;

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Stack alignItems="center" direction="row" spacing="8px">
          {channelStatus === TwitchConnectionStatus.DISCONNECTED &&
            (channelStatusMessage ? (
              <Tooltip title={channelStatusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {channelStatus === TwitchConnectionStatus.CONNECTING && (
            <CircularProgress size="24px" />
          )}
          {channelStatus === TwitchConnectionStatus.CONNECTED && (
            <Check color="success" />
          )}
          <Button
            onClick={() => {
              setChannelOpen(true);
            }}
            variant="contained"
          >
            {channelStatus === TwitchConnectionStatus.DISCONNECTED &&
            !channelStatusMessage
              ? 'SET UP'
              : 'CHANGE'}
          </Button>
          <DialogContentText>
            Twitch Channel: {channel ? channel : 'NONE'}
          </DialogContentText>
          <SetupDialog
            connection={TwitchConnection.CHANNEL}
            client={channelClient}
            callbackServerStatus={callbackServerStatus}
            callbackUrl={callbackUrl}
            port={port}
            open={channelOpen}
            setClient={async (newClient) => {
              await window.electron.setTwitchChannelClient(newClient);
              setChannelClient(newClient);
            }}
          />
        </Stack>
        <Stack alignItems="center" direction="row" spacing="8px">
          {botStatus === TwitchConnectionStatus.DISCONNECTED &&
            (botStatusMessage ? (
              <Tooltip title={botStatusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {botStatus === TwitchConnectionStatus.CONNECTING && (
            <CircularProgress size="24px" />
          )}
          {botStatus === TwitchConnectionStatus.CONNECTED && (
            <Check color="success" />
          )}
          <Button
            onClick={() => {
              setBotOpen(true);
            }}
            variant="contained"
          >
            {botStatus === TwitchConnectionStatus.DISCONNECTED &&
            !botStatusMessage
              ? 'SET UP'
              : 'CHANGE'}
          </Button>
          <DialogContentText>
            Twitch Bot: {botUserName ? botUserName : 'NONE'}
          </DialogContentText>
          <SetupDialog
            connection={TwitchConnection.BOT}
            client={botClient}
            callbackServerStatus={callbackServerStatus}
            callbackUrl={callbackUrl}
            port={port}
            open={botOpen}
            setClient={async (newClient) => {
              await window.electron.setTwitchBotClient(newClient);
              setBotClient(newClient);
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
