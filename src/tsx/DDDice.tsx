import { useEffect, useState } from 'react';
import { DDDiceFetchStatus, DDDiceRoom, DDDiceTheme } from '../types';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export default function DDDice() {
  const [apiKey, setApiKey] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [themeId, setThemeId] = useState('');

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(DDDiceFetchStatus.NONE);
  const [usernameStatusMessage, setUsernameStatusMessage] = useState('');

  const [rooms, setRooms] = useState<DDDiceRoom[]>([]);
  const [roomsStatus, setRoomsStatus] = useState(DDDiceFetchStatus.NONE);
  const [roomsStatusMessage, setRoomsStatusMessage] = useState('');

  const [themes, setThemes] = useState<DDDiceTheme[]>([]);
  const [themesStatus, setThemesStatus] = useState(DDDiceFetchStatus.NONE);
  const [themesStatusMessage, setThemesStatusMessage] = useState('');

  useEffect(() => {
    const inner = async () => {
      const apiKeyPromise = window.electron.getDDDiceApiKey();
      const roomSlugPromise = window.electron.getDDDiceRoomSlug();
      const themeIdPromise = window.electron.getDDDiceThemeId();
      const usernamePromise = window.electron.getDDDiceUsername();
      const roomsPromise = window.electron.getDDDiceRooms();
      const themesPromise = window.electron.getDDDiceThemes();
      setApiKey(await apiKeyPromise);

      const roomSlug = await roomSlugPromise;
      setRoomSlug(roomSlug);

      const themeId = await themeIdPromise;
      setThemeId(themeId);

      const initialUsername = await usernamePromise;
      setUsername(initialUsername.username);
      setUsernameStatus(initialUsername.status);
      setUsernameStatusMessage(initialUsername.message);

      const initialRooms = await roomsPromise;
      setRooms(initialRooms.rooms);
      setRoomsStatus(initialRooms.status);
      setRoomsStatusMessage(initialRooms.message);
      if (roomSlug && initialRooms.status === DDDiceFetchStatus.FETCHED) {
        if (!initialRooms.rooms.find((room) => room.slug === roomSlug)) {
          setRoomsStatus(DDDiceFetchStatus.NONE);
          setRoomsStatusMessage('Invalid room selected');
        }
      }

      const initialThemes = await themesPromise;
      setThemes(initialThemes.themes);
      setThemesStatus(initialThemes.status);
      setThemesStatusMessage(initialThemes.message);
      if (themeId && initialThemes.status === DDDiceFetchStatus.FETCHED) {
        if (!initialThemes.themes.find((theme) => theme.id === themeId)) {
          setThemesStatus(DDDiceFetchStatus.NONE);
          setThemesStatusMessage('Invalid theme selected');
        }
      }
    };
    inner();
  }, []);

  useEffect(() => {
    window.electron.onDDDiceUsername((event, status, username, message) => {
      setUsername(username);
      setUsernameStatus(status);
      setUsernameStatusMessage(message);
    });
  }, []);
  useEffect(() => {
    window.electron.onDDDiceRooms((event, status, rooms, message) => {
      setRooms(rooms);
      setRoomsStatus(status);
      setRoomsStatusMessage(message);
      if (roomSlug && status === DDDiceFetchStatus.FETCHED) {
        if (!rooms.find((room) => room.slug === roomSlug)) {
          setRoomsStatus(DDDiceFetchStatus.NONE);
          setRoomsStatusMessage('Invalid room selected');
        }
      }
    });
  }, [roomSlug]);
  useEffect(() => {
    window.electron.onDDDiceThemes((event, status, themes, message) => {
      setThemes(themes);
      setThemesStatus(status);
      setThemesStatusMessage(message);
      if (themeId && status === DDDiceFetchStatus.FETCHED) {
        if (!themes.find((theme) => theme.id === themeId)) {
          setThemesStatus(DDDiceFetchStatus.NONE);
          setThemesStatusMessage('Invalid theme selected');
        }
      }
    });
  }, [themeId]);

  const [roomsOpen, setRoomsOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const filterLower = filter.toLocaleLowerCase();

  const searchBox = (
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
  );
  const roomMapPred = ({ name, slug }: { name: string; slug: string }) => (
    <ListItem disableGutters>
      <ListItemButton
        disableGutters
        onClick={async () => {
          await window.electron.setDDDiceRoomSlug(slug);
          setRoomSlug(slug);
          setRoomsStatus(DDDiceFetchStatus.FETCHED);
          setRoomsStatusMessage('');
          setRoomsOpen(false);
          setFilter('');
        }}
      >
        {name} - {slug}
      </ListItemButton>
    </ListItem>
  );
  const themeMapPred = ({ id, name }: { id: string; name: string }) => (
    <ListItem disableGutters>
      <ListItemButton
        disableGutters
        onClick={async () => {
          await window.electron.setDDDiceThemeId(id);
          setThemeId(id);
          setThemesStatus(DDDiceFetchStatus.FETCHED);
          setThemesStatusMessage('');
          setThemesOpen(false);
          setFilter('');
        }}
      >
        {name} - {id}
      </ListItemButton>
    </ListItem>
  );

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <DialogContentText paddingLeft="32px">
          Get your API key from the{' '}
          <Link
            href="https://dddice.com/account/developer"
            target="_blank"
            rel="noreferrer"
          >
            dddice Developer Console
          </Link>
          .
        </DialogContentText>
        <Stack alignItems="center" direction="row" spacing="8px">
          {usernameStatus === DDDiceFetchStatus.NONE &&
            (usernameStatusMessage ? (
              <Tooltip title={usernameStatusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {usernameStatus === DDDiceFetchStatus.FETCHING && (
            <CircularProgress size="24px" />
          )}
          {usernameStatus === DDDiceFetchStatus.FETCHED && (
            <Check color="success" />
          )}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              window.electron.setDDDiceApiKey(apiKey);
            }}
          >
            <TextField
              label="dddice Api Key"
              onChange={async (event) => {
                setApiKey(event.target.value);
              }}
              size="small"
              type="password"
              value={apiKey}
            />
          </form>
          {username && <DialogContentText>{username}</DialogContentText>}
        </Stack>
        <Stack alignItems="center" direction="row" spacing="8px">
          {roomsStatus === DDDiceFetchStatus.NONE &&
            (roomsStatusMessage ? (
              <Tooltip title={roomsStatusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {roomsStatus === DDDiceFetchStatus.FETCHING && (
            <CircularProgress size="24px" />
          )}
          {roomsStatus === DDDiceFetchStatus.FETCHED && (
            <Check color="success" />
          )}
          <Button
            onClick={async () => {
              setRoomsOpen(true);
            }}
            variant="contained"
          >
            {roomSlug ? 'CHANGE' : 'SET'}
          </Button>
          <DialogContentText>
            dddice Room: {roomSlug ?? 'NONE'}
          </DialogContentText>
          <Dialog
            fullWidth
            open={roomsOpen}
            onClose={() => {
              setRoomsOpen(false);
            }}
          >
            <DialogTitle>Set dddice Room</DialogTitle>
            <DialogContent>
              {searchBox}
              {roomsStatus === DDDiceFetchStatus.FETCHING ? (
                <Stack direction="row" justifyContent="center" marginTop="8px">
                  <CircularProgress size="24px" />
                </Stack>
              ) : (
                <List>
                  {filter
                    ? rooms
                        .filter(
                          ({ name, slug }) =>
                            name.toLocaleLowerCase().includes(filterLower) ||
                            slug.toLocaleLowerCase().includes(filterLower),
                        )
                        .map(roomMapPred)
                    : rooms.map(roomMapPred)}
                </List>
              )}
            </DialogContent>
          </Dialog>
        </Stack>
        <Stack alignItems="center" direction="row" spacing="8px">
          {themesStatus === DDDiceFetchStatus.NONE &&
            (themesStatusMessage ? (
              <Tooltip title={themesStatusMessage}>
                <Close color="error" />
              </Tooltip>
            ) : (
              <Close color="error" />
            ))}
          {themesStatus === DDDiceFetchStatus.FETCHING && (
            <CircularProgress size="24px" />
          )}
          {themesStatus === DDDiceFetchStatus.FETCHED && (
            <Check color="success" />
          )}
          <Button
            onClick={async () => {
              setThemesOpen(true);
            }}
            variant="contained"
          >
            {themeId ? 'CHANGE' : 'SET'}
          </Button>
          <DialogContentText>
            dddice Theme: {themeId ?? 'NONE'}
          </DialogContentText>
          <Dialog
            fullWidth
            open={themesOpen}
            onClose={() => {
              setThemesOpen(false);
              setFilter('');
            }}
          >
            <DialogTitle>Set dddice Theme</DialogTitle>
            <DialogContent>
              {searchBox}
              {themesStatus === DDDiceFetchStatus.FETCHING ? (
                <Stack direction="row" justifyContent="center" marginTop="8px">
                  <CircularProgress size="24px" />
                </Stack>
              ) : (
                <List>
                  {filter
                    ? themes
                        .filter(
                          ({ id, name }) =>
                            id.toLocaleLowerCase().includes(filterLower) ||
                            name.toLocaleLowerCase().includes(filterLower),
                        )
                        .map(themeMapPred)
                    : themes.map(themeMapPred)}
                </List>
              )}
            </DialogContent>
          </Dialog>
        </Stack>
      </Stack>
    </Paper>
  );
}
