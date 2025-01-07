import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export default function ManualRoll() {
  const [roll, setRoll] = useState('');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRolling(true);
        try {
          setResult(await window.electron.ddDiceRoll(roll));
          setError('');
        } catch (e: unknown) {
          setResult('');
          if (e instanceof Error) {
            setError(e.message);
          }
        } finally {
          setRolling(false);
        }
      }}
    >
      <Stack alignItems="center" direction="row" spacing="8px">
        <TextField
          label="Roll (2d6)"
          onChange={(event) => {
            setRoll(event.target.value);
          }}
          size="small"
          value={roll}
        />
        <Button
          disabled={rolling}
          endIcon={rolling ? <CircularProgress size="24px" /> : undefined}
          type="submit"
          variant="contained"
        >
          Roll!
        </Button>
      </Stack>
      <Box style={{ minHeight: '20px' }}>
        <Typography color={error ? 'error' : undefined} variant="caption">
          {result}
          {error}
        </Typography>
      </Box>
    </form>
  );
}
