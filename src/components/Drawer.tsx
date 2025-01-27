"use client";

import React from "react";

interface DrawerProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Drawer: React.FC<DrawerProps> = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end">
      <div className="w-96 bg-white h-full p-6 shadow-lg relative">
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};

export default Drawer;
