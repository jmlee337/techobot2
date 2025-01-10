import { Stack } from '@mui/material';
import Twitch from './Twitch';
import DDDice from './DDDice';
import ChaosCards from './ChaosCards';
import Streamerbot from './Streamerbot';

export default function Settings() {
  return (
    <>
      <Stack spacing="8px">
        <Twitch />
        <Streamerbot />
        <DDDice />
        <ChaosCards />
      </Stack>
    </>
  );
}
