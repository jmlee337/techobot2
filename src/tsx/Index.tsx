import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.body);
root.render(
  <ThemeProvider
    theme={createTheme({
      typography: {
        fontFamily: 'Lora Variable',
      },
    })}
  >
    <App />
  </ThemeProvider>,
);
