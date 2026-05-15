import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { PlayerProvider } from "./contexts/PlayerContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PlayerProvider>
          <AppRoutes />
        </PlayerProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
