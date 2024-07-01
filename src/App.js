import './App.css';
import { Home } from './Pages/Home';
import { Route, Routes } from 'react-router-dom';
import { VideoCall } from './Pages/VideoCall';

function App() {
  return (
    <div>
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path="/room/:ID" element={<VideoCall />} />
        </Routes>
    </div>
  );
}

export default App;
