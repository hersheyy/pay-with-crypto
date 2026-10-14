import React from 'react';
import './common.css';

function HeaderComponent() {
  return (
    <header>
      <div className="header">
        <div className="push">Cryptocurrency Bill Payment</div>
        <div>Interface Prototype</div>
      </div>
      <hr style={{ backgroundColor: 'gray', height: '2px', border: 'none' }} />
    </header>
  );
}

export default HeaderComponent;
