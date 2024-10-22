import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <p>
            © 2024 AWS Industry Builder - Aaron Yi
            <span className="text-red-500 ml-1" aria-label="love">❤ </span>
            All rights reserved.
          </p>
          <div>
            <a href="#" className="mr-4">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;