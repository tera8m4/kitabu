import { Link } from 'react-router-dom';
import './Navigation.css';
import iconUrl from '../../../assets/icon.png';

const Navigation = () => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/home" className="nav-logo">
          <img src={iconUrl} alt="Kitabu" className="nav-icon" />
          Kitabu
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/home" className="nav-link">
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className="nav-link">
              About
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/settings" className="nav-link">
              Settings
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
