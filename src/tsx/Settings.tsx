import { Stack } from '@mui/material';
import Twitch from './Twitch';
import DDDice from './DDDice';

export default function Settings() {
  return (
    <>
      <Stack spacing="16px">
        <Twitch />
        <DDDice />
      </Stack>
    </>
  );
}
