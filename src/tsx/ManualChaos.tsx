import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';

export default function ManualChaos() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  return (
    <Paper elevation={2} square>
      <Stack padding="8px" spacing="8px">
        <Button
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              await window.electron.chaosCard();
              setError('');
            } catch (e: unknown) {
              if (e instanceof Error) {
                setError(e.message);
              }
            }
            setSending(false);
          }}
          variant="contained"
        >
          Chaos Card (1)
        </Button>
        <Button
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              await window.electron.chaosPlus();
              setError('');
            } catch (e: unknown) {
              if (e instanceof Error) {
                setError(e.message);
              }
            }
            setSending(false);
          }}
          variant="contained"
        >
          Chaos Plus (3)
        </Button>
        <Box style={{ minHeight: '20px' }}>
          <Typography color="error" variant="caption">
            {error}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
