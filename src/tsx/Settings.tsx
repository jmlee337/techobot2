import { Stack } from '@mui/material';
import Twitch from './Twitch';
import DDDice from './DDDice';
import ChaosCards from './ChaosCards';

export default function Settings() {
  return (
    <>
      <Stack spacing="8px">
        <Twitch />
        <DDDice />
        <ChaosCards />
      </Stack>
    </>
  );
}
