import { useEffect, useState } from 'react';
import { StreamerbotAction, StreamerbotStatus } from '../types';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

enum Action {
  CHAOS_CARDS,
  QUEST_OPEN,
}

export default function Streamerbot() {
  const [status, setStatus] = useState(StreamerbotStatus.DISCONNECTED);
  const [statusMessage, setStatusMessage] = useState('');
  const [actions, setActions] = useState<StreamerbotAction[]>([]);
  const [actionsError, setActionsError] = useState('');
  const [chaosCardsActionId, setChaosCardsActionId] = useState('');
  const [chaosCardsActionName, setChaosCardsActionName] = useState('');
  const [questOpenActionId, setQuestOpenActionId] = useState('');
  const [questOpenActionName, setQuestOpenActionName] = useState('');
  const [port, setPort] = useState(0);

  const [open, setOpen] = useState(false);
  const [openAction, setOpenAction] = useState(Action.CHAOS_CARDS);

  useEffect(() => {
    (async () => {
      const statusPromise = window.electron.getStreamerbotStatus();
      const actionsPromise = window.electron.getStreamerbotActions();
      const actionsErrorPromise = window.electron.getStreamerbotActionsError();
      const portPromise = window.electron.getStreamerbotPort();
      const chaosCardsActionIdPromise =
        window.electron.getStreamerbotChaosCardsActionId();
      const questOpenActionIdPromise =
        window.electron.getStreamerbotQuestOpenActionId();

      const initialStatus = await statusPromise;
      setStatus(initialStatus.status);
      setStatusMessage(initialStatus.message);
      const initialActions = await actionsPromise;
      setActions(initialActions);
      setActionsError(await actionsErrorPromise);
      setPort(await portPromise);
      const initialChaosCardsActionId = await chaosCardsActionIdPromise;
      setChaosCardsActionId(initialChaosCardsActionId);
      const initialQuestOpenActionId = await questOpenActionIdPromise;
      setQuestOpenActionId(initialQuestOpenActionId);
      const chaosCardsAction = initialActions.find(
        (action) => action.id === initialChaosCardsActionId,
      );
      if (chaosCardsAction) {
        setChaosCardsActionName(chaosCardsAction.name);
      }
      const questOpenAction = initialActions.find(
        (action) => action.id === initialQuestOpenActionId,
      );
      if (questOpenAction) {
        setQuestOpenActionName(questOpenAction.name);
      }
    })();
  }, []);
  useEffect(() => {
    window.electron.onStreamerbotStatus((event, newStatus, newMessage) => {
      setStatus(newStatus);
      setStatusMessage(newMessage);
    });
    window.electron.onStreamerbotActions((event, newActions) => {
      setActions(newActions);
      const chaosCardsAction = newActions.find(
        (action) => action.id === chaosCardsActionId,
      );
      if (chaosCardsAction) {
        setChaosCardsActionName(chaosCardsAction.name);
      } else {
        setChaosCardsActionName('');
      }
      const questOpenAction = newActions.find(
        (action) => action.id === questOpenActionId,
      );
      if (questOpenAction) {
        setQuestOpenActionName(questOpenAction.name);
      } else {
        setQuestOpenActionName('');
      }
    });
    window.electron.onStreamerbotActionsError((event, newActionsError) => {
      setActionsError(newActionsError);
    });
  }, []);

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Stack alignItems="center" direction="row" spacing="8px">
          {status === StreamerbotStatus.DISCONNECTED &&
            (statusMessage ? (
              <Tooltip title={statusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {status === StreamerbotStatus.CONNECTING && (
            <CircularProgress size="24px" />
          )}
          {status === StreamerbotStatus.CONNECTED && <Check color="success" />}
          <TextField
            label="Streamerbot Port"
            onChange={(event) => {
              const newPort = parseInt(event.target.value, 10);
              if (Number.isInteger(newPort)) {
                setPort(newPort);
              }
            }}
            size="small"
            value={port}
          />
          {status === StreamerbotStatus.DISCONNECTED && (
            <Button
              onClick={() => {
                window.electron.streamerbotRetry(port);
              }}
              variant="contained"
            >
              Retry...
            </Button>
          )}
        </Stack>
        <Stack alignItems="center" direction="row" spacing="8px">
          {actionsError ? (
            <Tooltip title={actionsError}>
              <Close color="error" />
            </Tooltip>
          ) : status === StreamerbotStatus.CONNECTED && actions.length === 0 ? (
            <CircularProgress size="24px" />
          ) : chaosCardsActionName ? (
            <Check color="success" />
          ) : (
            <Close color="error" />
          )}
          <Button
            onClick={async () => {
              setOpen(true);
              setOpenAction(Action.CHAOS_CARDS);
            }}
            variant="contained"
          >
            {chaosCardsActionId ? 'CHANGE' : 'SET'}
          </Button>
          <DialogContentText>
            Chaos Cards {chaosCardsActionName ? 'Action Name' : 'Action ID'}:{' '}
            {chaosCardsActionName || chaosCardsActionId || 'NONE'}
          </DialogContentText>
        </Stack>
        <Stack alignItems="center" direction="row" spacing="8px">
          {actionsError ? (
            <Tooltip title={actionsError}>
              <Close color="error" />
            </Tooltip>
          ) : status === StreamerbotStatus.CONNECTED && actions.length === 0 ? (
            <CircularProgress size="24px" />
          ) : questOpenActionName ? (
            <Check color="success" />
          ) : (
            <Close color="error" />
          )}
          <Button
            onClick={async () => {
              setOpen(true);
              setOpenAction(Action.QUEST_OPEN);
            }}
            variant="contained"
          >
            {questOpenActionId ? 'CHANGE' : 'SET'}
          </Button>
          <DialogContentText>
            Quest Open {questOpenActionName ? 'Action Name' : 'Action ID'}:{' '}
            {questOpenActionName || questOpenActionId || 'NONE'}
          </DialogContentText>
        </Stack>
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        >
          <DialogTitle>
            Setting {openAction === Action.CHAOS_CARDS && 'Chaos Cards'}
            {openAction === Action.QUEST_OPEN && 'Quest Open'} Action
          </DialogTitle>
          <DialogContent>
            <List>
              {actions.map(({ id, name }) => (
                <ListItem key={id} disablePadding>
                  <ListItemButton
                    disableGutters
                    onClick={async () => {
                      try {
                        if (openAction === Action.CHAOS_CARDS) {
                          await window.electron.setStreamerbotChaosCardsActionId(
                            id,
                          );
                          setChaosCardsActionId(id);
                          setChaosCardsActionName(name);
                        } else if (openAction === Action.QUEST_OPEN) {
                          await window.electron.setStreamerbotQuestOpenActionId(
                            id,
                          );
                          setQuestOpenActionId(id);
                          setQuestOpenActionName(name);
                        }
                        setOpen(false);
                      } catch {
                        // just catch
                      }
                    }}
                  >
                    {name}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </Dialog>
      </Stack>
    </Paper>
  );
}
