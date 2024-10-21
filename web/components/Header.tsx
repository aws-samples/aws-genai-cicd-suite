import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">AWS GenAI CI/CD Suite</h1>
        <nav>
          <ul className="flex space-x-6 items-center">
            <li><a href="#features" className="text-gray-600 hover:text-blue-600 transition duration-300">Features</a></li>
            <li><a href="#comparison" className="text-gray-600 hover:text-blue-600 transition duration-300">Comparison</a></li>
            <li>
              <a 
                href="#quickstart" 
                className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full font-bold transition duration-300 animate-pulse"
              >
                Quick Start
              </a>
            </li>
            <li><a href="#faq" className="text-gray-600 hover:text-blue-600 transition duration-300">FAQ</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;