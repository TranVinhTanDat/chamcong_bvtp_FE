import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. CSS cơ bản trước
import './index.css';

// 2. Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// 3. Icon fonts
import 'remixicon/fonts/remixicon.css';

// 4. Third party CSS
import 'react-toastify/dist/ReactToastify.css';

// 5. Custom CSS cuối cùng (để override)
import './components/assets/style/variables.css'; // Cập nhật đường dẫn

// 6. Bootstrap JS cho dropdown, modal...
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import 'bootstrap/dist/css/bootstrap.min.css';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);