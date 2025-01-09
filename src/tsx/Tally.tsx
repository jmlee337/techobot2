import { useEffect, useState } from 'react';
import { Tally as TallyType } from '../types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';

function TallyInner({ all }: { all: TallyType[] }) {
  return (
    <List>
      {all.map(({ userId, userName, points }) => (
        <ListItem key={userId} disableGutters>
          <Stack direction="row" justifyContent="space-between" spacing="8px">
            <ListItemText>{userName}</ListItemText>
            <ListItemText>{points}</ListItemText>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}

export default function Tally() {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<TallyType[]>([]);
  const [hasPast, setHasPast] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [visibleKey, setVisibleKey] = useState('');
  const [past, setPast] = useState<{ key: string; tallies: TallyType[] }[]>([]);

  useEffect(() => {
    (async () => {
      setHasPast(await window.electron.getTallyHasPast());
    })();
  }, []);

  return (
    <Paper elevation={2}>
      <Stack padding="8px">
        <Button
          onClick={async () => {
            setOpen(true);
            try {
              setAll(await window.electron.getTallyAll());
            } catch {
              // just catch
            }
          }}
          variant="contained"
        >
          Tally
        </Button>
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        >
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            marginRight="24px"
          >
            <DialogTitle>Tally</DialogTitle>
            {hasPast && (
              <Button
                onClick={async () => {
                  setPastOpen(true);
                  try {
                    const newPast = await window.electron.getTallyPast();
                    setPast(newPast);
                    if (newPast.length > 0) {
                      setVisibleKey(newPast[0].key);
                    }
                  } catch {
                    // just catch
                  }
                }}
                variant="contained"
              >
                Past...
              </Button>
            )}
          </Stack>
          <DialogContent>
            <TallyInner all={all} />
          </DialogContent>
        </Dialog>
        <Dialog
          open={pastOpen}
          onClose={() => {
            setPastOpen(false);
          }}
        >
          <DialogTitle>Past Tallies</DialogTitle>
          <DialogContent>
            <Tabs
              value={visibleKey}
              onChange={(event, value) => {
                if (typeof value === 'string') {
                  setVisibleKey(value);
                }
              }}
              aria-label="Queues"
              variant="scrollable"
            >
              {past.map(({ key }) => (
                <Tab
                  key={key}
                  label={key}
                  value={key}
                  id={`past-tab-${key}`}
                  aria-controls={`past-tabpanel-${key}`}
                />
              ))}
            </Tabs>
            {past.map(({ key, tallies }) => (
              <div
                role="tabpanel"
                hidden={key !== visibleKey}
                id={`past-tabpanel-${key}`}
                aria-labelledby={`past-tab-${key}`}
              >
                {key === visibleKey && <TallyInner all={tallies} />}
              </div>
            ))}
          </DialogContent>
        </Dialog>
      </Stack>
    </Paper>
  );
}
