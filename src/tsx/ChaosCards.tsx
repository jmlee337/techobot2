import { useEffect, useState } from 'react';
import { ChaosStatus } from '../types';
import {
  Button,
  CircularProgress,
  DialogContentText,
  Stack,
  Tooltip,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export default function ChaosCards() {
  const [status, setStatus] = useState(ChaosStatus.NONE);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const inner = async () => {
      const initialStatus = await window.electron.getChaosStatus();
      setStatus(initialStatus.status);
      setStatusMessage(initialStatus.message);
    };
    inner();
  }, []);
  useEffect(() => {
    window.electron.onChaosStatus((event, status, message) => {
      setStatus(status);
      setStatusMessage(message);
    });
  }, []);

  return (
    <Stack alignItems="center" direction="row" spacing="8px">
      {status === ChaosStatus.NONE &&
        (statusMessage ? (
          <Tooltip title={statusMessage}>
            <Close color="error" />
          </Tooltip>
        ) : (
          <Close color="error" />
        ))}
      {status === ChaosStatus.STARTING && (
        <Tooltip title="Starting WebSocketServer">
          <CircularProgress size="24px" />
        </Tooltip>
      )}
      {status === ChaosStatus.STARTED && (
        <Tooltip title="Waiting for WebSocketClient">
          <CircularProgress size="24px" />
        </Tooltip>
      )}
      {status === ChaosStatus.CONNECTED && <Check color="success" />}
      <Button
        onClick={() => {
          window.electron.showChaosHtml();
        }}
        variant="contained"
      >
        Show HTML
      </Button>
      <DialogContentText>Chaos Cards</DialogContentText>
    </Stack>
  );
}
