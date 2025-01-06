import { useEffect, useState } from 'react';
import { DDDiceRoom, DDDiceTheme } from '../types';
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
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export default function DDDice() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [gettingUsername, setGettingUsername] = useState(true);
  const [username, setUsername] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [themeId, setThemeId] = useState('');

  useEffect(() => {
    const inner = async () => {
      const usernamePromise = window.electron.getDDDiceUsername();
      const apiKeyPromise = window.electron.getDDDiceApiKey();
      const roomSlugPromise = window.electron.getDDDiceRoomSlug();
      const themeIdPromise = window.electron.getDDDiceThemeId();
      setApiKey(await apiKeyPromise);
      setRoomSlug(await roomSlugPromise);
      setThemeId(await themeIdPromise);
      try {
        setUsername(await usernamePromise);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setApiKeyError(e.message);
        }
      } finally {
        setGettingUsername(false);
      }
    };
    inner();
  }, []);

  const [rooms, setRooms] = useState<DDDiceRoom[]>([]);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [gettingRooms, setGettingRooms] = useState(false);
  const [themes, setThemes] = useState<DDDiceTheme[]>([]);
  const [themesOpen, setThemesOpen] = useState(false);
  const [gettingThemes, setGettingThemes] = useState(false);
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
          setRoomsOpen(false);
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
          setThemesOpen(false);
          setFilter('');
        }}
      >
        {name} - {id}
      </ListItemButton>
    </ListItem>
  );

  return (
    <Stack spacing="8px">
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
        {gettingUsername ? (
          <CircularProgress size="24px" />
        ) : username ? (
          <Check color="success" />
        ) : apiKeyError ? (
          <Tooltip title={apiKeyError}>
            <Close color="error" />
          </Tooltip>
        ) : (
          <Close color="error" />
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            setGettingUsername(true);
            try {
              setUsername(await window.electron.setDDDiceApiKey(apiKey));
              setApiKeyError('');
            } catch (e: unknown) {
              setUsername('');
              if (e instanceof Error) {
                setApiKeyError(e.message);
              }
            } finally {
              setGettingUsername(false);
            }
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
      <Stack
        alignItems="center"
        direction="row"
        paddingLeft="32px"
        spacing="8px"
      >
        <Button
          onClick={async () => {
            setRoomsOpen(true);
            setGettingRooms(true);
            try {
              setRooms(await window.electron.getDDDiceRooms());
            } catch (e: unknown) {
              // error alert
              setRoomsOpen(false);
            } finally {
              setGettingRooms(false);
            }
          }}
          variant="contained"
        >
          {roomSlug ? 'CHANGE' : 'SET'}
        </Button>
        <DialogContentText>dddice Room: {roomSlug ?? 'NONE'}</DialogContentText>
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
            {gettingRooms ? (
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
      <Stack
        alignItems="center"
        direction="row"
        paddingLeft="32px"
        spacing="8px"
      >
        <Button
          onClick={async () => {
            setThemesOpen(true);
            setGettingThemes(true);
            try {
              setThemes(await window.electron.getDDDiceThemes());
            } catch (e: unknown) {
              // error alert
              setThemesOpen(false);
            } finally {
              setGettingThemes(false);
            }
          }}
          variant="contained"
        >
          {themeId ? 'CHANGE' : 'SET'}
        </Button>
        <DialogContentText>dddice Theme: {themeId ?? 'NONE'}</DialogContentText>
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
            {gettingThemes ? (
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
  );
}
