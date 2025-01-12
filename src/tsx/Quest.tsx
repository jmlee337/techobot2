import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  QuestCompletion,
  QuestGold,
  QuestState,
  QuestSuggestion,
  RendererQuest,
} from '../types';
import { useEffect, useState } from 'react';
import { DeleteForever } from '@mui/icons-material';

enum VisibleTab {
  CURRENT,
  LAST,
  GOLD,
}

function Completions({ completions }: { completions: QuestCompletion[] }) {
  return (
    <List>
      {completions.map(({ userId, userName, progress }) => (
        <ListItem key={userId} disablePadding>
          <ListItemText>
            {userName}
            {progress > 0 && ` (progress: ${progress})`}
          </ListItemText>
        </ListItem>
      ))}
    </List>
  );
}

export default function Quest() {
  const [state, setState] = useState(QuestState.CLOSED);
  const [settingState, setSettingState] = useState(false);
  const [current, setCurrent] = useState<RendererQuest>({
    desc: '',
    progress: 0,
    gold: 0,
  });
  const [suggestions, setSuggestions] = useState<QuestSuggestion[]>([]);

  useEffect(() => {
    (async () => {
      const statePromise = window.electron.getQuestState();
      const currentPromise = window.electron.getQuestCurrent();
      const suggestionsPromise = window.electron.getQuestSuggestions();

      setState(await statePromise);
      setCurrent(await currentPromise);
      setSuggestions(await suggestionsPromise);
    })();
  }, []);

  useEffect(() => {
    window.electron.onQuestCurrent((event, newCurrent) => {
      setCurrent(newCurrent);
    });
    window.electron.onQuestSuggestions((event, suggestions) => {
      setSuggestions(suggestions);
    });
  });

  const [open, setOpen] = useState(false);
  const [visibleTab, setVisibleTab] = useState(VisibleTab.CURRENT);
  const [currentCompletions, setCurrentCompletions] = useState<
    QuestCompletion[]
  >([]);
  const [lastCompletions, setLastCompletions] = useState<QuestCompletion[]>([]);
  const [allGolds, setAllGolds] = useState<QuestGold[]>([]);

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing="8px"
        >
          <Typography align="center" variant="h6">
            Party Quest
          </Typography>
          <Button
            onClick={async () => {
              setVisibleTab(VisibleTab.CURRENT);
              setOpen(true);
              setCurrentCompletions(
                await window.electron.getQuestCurrentCompletions(),
              );
            }}
            variant="contained"
          >
            Review
          </Button>
        </Stack>
        <ToggleButtonGroup
          aria-label="Quest State"
          color="primary"
          disabled={settingState}
          exclusive
          onChange={async (event, newState) => {
            setSettingState(true);
            try {
              setState(await window.electron.setQuestState(newState));
            } catch {
              // just catch
            }
            setSettingState(false);
          }}
          orientation="vertical"
          style={{ flexGrow: 1 }}
          value={state}
        >
          <ToggleButton size="small" value={QuestState.SUGGESTING}>
            Suggesting
          </ToggleButton>
          <ToggleButton
            disabled={state === QuestState.CLOSED}
            size="small"
            value={QuestState.VOTING}
          >
            Voting
          </ToggleButton>
          <ToggleButton size="small" value={QuestState.CLOSED}>
            Closed
          </ToggleButton>
        </ToggleButtonGroup>
        <Stack minHeight="20px">
          {current.desc && (
            <Typography variant="caption">
              {current.desc}, gold: {current.gold}
              {current.progress ? ` (group progress: ${current.progress})` : ''}
            </Typography>
          )}
          {suggestions.length > 0 && (
            <List>
              {suggestions.map(({ id, desc, votes }) => (
                <ListItem
                  key={id}
                  disableGutters
                  secondaryAction={
                    <Tooltip title="delete">
                      <IconButton
                        onClick={() => {
                          window.electron.deleteQuestSuggestion(id);
                        }}
                      >
                        <DeleteForever />
                      </IconButton>
                    </Tooltip>
                  }
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <ListItemText
                    slotProps={{ primary: { variant: 'caption' } }}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                  >
                    {id}
                  </ListItemText>
                  <ListItemText slotProps={{ primary: { variant: 'caption' } }}>
                    {desc}
                  </ListItemText>
                  <ListItemText
                    slotProps={{ primary: { variant: 'caption' } }}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                  >
                    {votes}
                  </ListItemText>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        >
          <DialogTitle>Party Quests</DialogTitle>
          <DialogContent>
            <Tabs
              value={visibleTab}
              onChange={async (event, value) => {
                if (typeof value === 'number') {
                  setVisibleTab(value);
                  if (value === VisibleTab.CURRENT) {
                    setCurrentCompletions(
                      await window.electron.getQuestCurrentCompletions(),
                    );
                  } else if (
                    value === VisibleTab.LAST &&
                    lastCompletions.length === 0
                  ) {
                    setLastCompletions(
                      await window.electron.getQuestLastCompletions(),
                    );
                  } else if (
                    value === VisibleTab.GOLD &&
                    allGolds.length === 0
                  ) {
                    setAllGolds(await window.electron.getQuestAllGolds());
                  }
                }
              }}
              aria-label="Queues"
              variant="scrollable"
            >
              <Tab
                label={'Current'}
                value={VisibleTab.CURRENT}
                id={`quest-tab-${VisibleTab.CURRENT}`}
                aria-controls={`quest-tabpanel-${VisibleTab.CURRENT}`}
              />
              <Tab
                label={'Last'}
                value={VisibleTab.LAST}
                id={`quest-tab-${VisibleTab.LAST}`}
                aria-controls={`quest-tabpanel-${VisibleTab.LAST}`}
              />
              <Tab
                label={'Gold'}
                value={VisibleTab.GOLD}
                id={`quest-tab-${VisibleTab.GOLD}`}
                aria-controls={`quest-tabpanel-${VisibleTab.GOLD}`}
              />
            </Tabs>
            <div
              role="tabpanel"
              hidden={visibleTab !== VisibleTab.CURRENT}
              id={`quest-tabpanel-${VisibleTab.CURRENT}`}
              aria-labelledby={`quest-tab-${VisibleTab.CURRENT}`}
            >
              <Completions completions={currentCompletions} />
            </div>
            <div
              role="tabpanel"
              hidden={visibleTab !== VisibleTab.LAST}
              id={`quest-tabpanel-${VisibleTab.LAST}`}
              aria-labelledby={`quest-tab-${VisibleTab.LAST}`}
            >
              <Completions completions={lastCompletions} />
            </div>
            <div
              role="tabpanel"
              hidden={visibleTab !== VisibleTab.GOLD}
              id={`quest-tabpanel-${VisibleTab.GOLD}`}
              aria-labelledby={`quest-tab-${VisibleTab.GOLD}`}
            >
              <List>
                {allGolds.map(({ userId, userName, gold }) => (
                  <ListItem key={userId} disableGutters style={{ gap: '8px' }}>
                    <ListItemText style={{ flexGrow: 0, flexShrink: 0 }}>
                      {gold}
                    </ListItemText>
                    <ListItemText>{userName}</ListItemText>
                  </ListItem>
                ))}
              </List>
            </div>
          </DialogContent>
        </Dialog>
      </Stack>
    </Paper>
  );
}
