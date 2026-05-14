import AppRoutes from "./routes/AppRoutes";
import { PlayerProvider } from "./contexts/PlayerContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </ThemeProvider>
  );
}

export default App;
