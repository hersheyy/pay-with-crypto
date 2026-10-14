import './App.css';
import FooterComponent from './common/FooterComponent';
import HeaderComponent from './common/HeaderComponent';
import Dashboard from './login/Dashboard';

function App() {
  return (
    <div className="App">
      <HeaderComponent/>
      <Dashboard/>
      <FooterComponent />
    </div>
  );
}

export default App;
