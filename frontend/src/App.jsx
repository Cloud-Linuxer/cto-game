import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastContainer } from './components/common/Toast';
import MenuPage from './pages/MenuPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';
import './styles/globals.css';
import './i18n/config';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/results/:gameId" element={<ResultsPage />} />
        </Routes>
        <ToastContainer />
      </Router>
    </Provider>
  );
}

export default App;