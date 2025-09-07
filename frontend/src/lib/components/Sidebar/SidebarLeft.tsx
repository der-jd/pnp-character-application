"use client";

import React from "react";

// Define the types for the sidebar
interface SidebarProps {
  content: React.ReactNode; // Accepts any type of React content (JSX, strings, components, etc.)
}

const Sidebar: React.FC<SidebarProps> = ({ content }) => {
  return (
    <div className="flex-1 bg-grey-500">
      <nav className="sidebar-nav">
        <ul>{content}</ul>
      </nav>
    </div>
  );
};

export default Sidebar;
