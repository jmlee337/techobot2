import {
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { QuestState } from '../types';
import { useState } from 'react';

export default function Quest() {
  const [state, setState] = useState(QuestState.CLOSED);

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Typography align="center" variant="h6">
          Party Quest
        </Typography>
        <ToggleButtonGroup
          aria-label="Quest State"
          color="primary"
          exclusive
          onChange={(event, newState) => {
            setState(newState);
          }}
          orientation="vertical"
          style={{ flexGrow: 1 }}
          value={state}
        >
          <ToggleButton size="small" value={QuestState.SUGGESTING}>
            Suggesting
          </ToggleButton>
          <ToggleButton size="small" value={QuestState.VOTING}>
            Voting
          </ToggleButton>
          <ToggleButton size="small" value={QuestState.CLOSED}>
            Closed
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Paper>
  );
}
