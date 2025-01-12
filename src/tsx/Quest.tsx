import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { QuestState, QuestSuggestion, RendererQuest } from '../types';
import { useEffect, useState } from 'react';
import { DeleteForever } from '@mui/icons-material';

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

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Typography align="center" variant="h6">
          Party Quest
        </Typography>
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
      </Stack>
    </Paper>
  );
}
