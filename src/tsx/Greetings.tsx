import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { Greeting } from '../types';
import { Close, DeleteForever, Edit } from '@mui/icons-material';

function AddDialog({
  open,
  setOpen,
  chatters,
  error,
  setError,
  getting,
  onAdd,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  chatters: { userId: string; userName: string }[];
  error: string;
  setError: (error: string) => void;
  getting: boolean;
  onAdd: () => Promise<void>;
}) {
  const [filter, setFilter] = useState('');
  const filterLower = filter.toLocaleLowerCase();
  const filtered = filter
    ? chatters.filter(({ userName }) =>
        userName.toLocaleLowerCase().includes(filterLower),
      )
    : [];
  const [gettingUserId, setGettingUserId] = useState(false);

  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [adding, setAdding] = useState(false);

  const add = async () => {
    setAdding(true);
    try {
      await window.electron.setGreeting(userId, userName, greeting);
      await onAdd();
      setUserId('');
      setUserName('');
      setGreeting('');
      setOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
    setAdding(false);
  };

  const mapPred = ({
    userId,
    userName,
  }: {
    userId: string;
    userName: string;
  }) => {
    return (
      <ListItem key={userId} disablePadding>
        <ListItemButton
          disableGutters
          onClick={() => {
            setUserId(userId);
            setUserName(userName);
          }}
        >
          <ListItemText>{userName}</ListItemText>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
        setUserId('');
        setUserName('');
        setGreeting('');
      }}
    >
      <DialogTitle>Add Greeting{userName && ` for ${userName}`}</DialogTitle>
      <DialogContent>
        <Stack spacing="8px">
          <TextField
            label="Search"
            onChange={(event) => {
              setFilter(event.target.value);
            }}
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <IconButton
                    onClick={() => {
                      setFilter('');
                    }}
                  >
                    <Close />
                  </IconButton>
                ),
              },
            }}
            style={{ marginTop: '8px' }}
            value={filter}
          />
          {getting ? (
            <Stack direction="row" justifyContent="center">
              <CircularProgress size="24px" />
            </Stack>
          ) : error ? (
            <DialogContentText color="error">{error}</DialogContentText>
          ) : userId && userName ? (
            <TextField
              label="Greeting"
              multiline
              onChange={(event) => {
                setGreeting(event.target.value);
              }}
              value={greeting}
              variant="filled"
            />
          ) : (
            <List>
              {filter ? (
                filtered.length > 0 ? (
                  filtered.map(mapPred)
                ) : (
                  <ListItem disablePadding>
                    <ListItemButton
                      disabled={gettingUserId}
                      disableGutters
                      onClick={async () => {
                        setGettingUserId(true);
                        try {
                          setUserId(
                            await window.electron.getTwitchUserId(filter),
                          );
                          setUserName(filter);
                        } catch (e: unknown) {
                          if (e instanceof Error) {
                            setError(e.message);
                          }
                        }
                        setGettingUserId(false);
                      }}
                    >
                      <ListItemText>Add by username: {filter}</ListItemText>
                      {gettingUserId && <CircularProgress size="24px" />}
                    </ListItemButton>
                  </ListItem>
                )
              ) : (
                chatters.map(mapPred)
              )}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={!userId || !userName || !greeting}
          endIcon={adding ? <CircularProgress size="24px" /> : undefined}
          onClick={add}
          variant="contained"
        >
          {adding ? 'Adding...' : 'Add!'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Greetings() {
  const [open, setOpen] = useState(false);
  const [getting, setGetting] = useState(false);
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [filter, setFilter] = useState('');
  const filterLower = filter.toLocaleLowerCase();

  const [addOpen, setAddOpen] = useState(false);
  const [chatters, setChatters] = useState<
    { userId: string; userName: string }[]
  >([]);
  const [chattersError, setChattersError] = useState('');
  const [gettingChatters, setGettingChatters] = useState(false);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [setting, setSetting] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editGreeting, setEditGreeting] = useState('');

  const mapPred = ({
    userId,
    userName,
    greeting,
  }: {
    userId: string;
    userName: string;
    greeting: string;
  }) => (
    <ListItem
      key={userId}
      disableGutters
      style={{ display: 'flex', flexDirection: 'row' }}
    >
      <ListItemText style={{ flexGrow: 0, marginRight: '16px' }}>
        {userName}
      </ListItemText>
      <ListItemText style={{ flexGrow: 1, marginRight: '8px' }}>
        {greeting}
      </ListItemText>
      <Tooltip title="update">
        <IconButton
          disabled={setting}
          onClick={() => {
            setEditUserId(userId);
            setEditUserName(userName);
            setEditGreeting(greeting);
            setUpdateOpen(true);
          }}
        >
          <Edit />
        </IconButton>
      </Tooltip>
      <Tooltip title="delete">
        <IconButton
          disabled={setting}
          onClick={() => {
            setEditUserId(userId);
            setEditUserName(userName);
            setEditGreeting(greeting);
            setDeleteOpen(true);
          }}
        >
          <DeleteForever />
        </IconButton>
      </Tooltip>
    </ListItem>
  );
  return (
    <>
      <Button
        onClick={async () => {
          setOpen(true);
          setGetting(true);
          try {
            setGreetings(await window.electron.listGreetings());
          } catch {
            // just catch
          }
          setGetting(false);
        }}
        variant="contained"
      >
        Greetings
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        <DialogTitle>Greetings</DialogTitle>
        <DialogContent>
          <Stack
            alignItems="end"
            direction="row"
            justifyContent="space-between"
            spacing="8px"
          >
            <TextField
              label="Search"
              onChange={(event) => {
                setFilter(event.target.value);
              }}
              size="small"
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton
                      onClick={() => {
                        setFilter('');
                      }}
                    >
                      <Close />
                    </IconButton>
                  ),
                },
              }}
              style={{ marginTop: '8px' }}
              value={filter}
            />
            <Button
              onClick={async () => {
                setAddOpen(true);
                setGettingChatters(true);
                try {
                  setChatters(await window.electron.getTwitchChatters());
                  setChattersError('');
                } catch (e: unknown) {
                  if (e instanceof Error) {
                    setChattersError(e.message);
                  }
                }
                setGettingChatters(false);
              }}
              variant="contained"
            >
              Add!
            </Button>
          </Stack>
          {getting ? (
            <Stack direction="row" justifyContent="center">
              <CircularProgress size="24px" />
            </Stack>
          ) : (
            <List>
              {filter
                ? greetings
                    .filter(
                      ({ userName, greeting }) =>
                        userName.toLocaleLowerCase().includes(filterLower) ||
                        greeting.toLocaleLowerCase().includes(filterLower),
                    )
                    .map(mapPred)
                : greetings.map(mapPred)}
            </List>
          )}
        </DialogContent>
      </Dialog>
      <AddDialog
        open={addOpen}
        setOpen={setAddOpen}
        chatters={chatters}
        error={chattersError}
        setError={setChattersError}
        getting={gettingChatters}
        onAdd={async () => {
          try {
            setGreetings(await window.electron.listGreetings());
          } catch {
            // just catch
          }
        }}
      />
      <Dialog
        open={updateOpen}
        onClose={() => {
          setUpdateOpen(false);
        }}
      >
        <DialogTitle>Updating Greeting for {editUserName}</DialogTitle>
        <DialogContent>
          <TextField
            label="Greeting"
            onChange={(event) => {
              setEditGreeting(event.target.value);
            }}
            multiline
            value={editGreeting}
            variant="filled"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={async () => {
              setSetting(true);
              try {
                await window.electron.updateGreeting(editUserId, editGreeting);
                setGreetings(await window.electron.listGreetings());
              } catch {
                // just catch
              }
              setSetting(false);
              setUpdateOpen(false);
            }}
            variant="contained"
          >
            Update!
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
        }}
      >
        <DialogTitle>Delete Greeting for {editUserName}?</DialogTitle>
        <DialogContent>
          <TextField
            disabled
            label="Greeting"
            multiline
            value={editGreeting}
            variant="filled"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteOpen(false);
            }}
            variant="contained"
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={async () => {
              setSetting(true);
              try {
                await window.electron.deleteGreeting(editUserId);
                setGreetings(await window.electron.listGreetings());
              } catch {
                // just catch
              }
              setSetting(false);
              setDeleteOpen(false);
            }}
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
