import React from "react";

interface SidebarRightProps {
  content?: React.ReactNode;
}

const SidebarRight: React.FC<SidebarRightProps> = ({ content }) => {
  return (
    <aside className="h-full overflow-y-auto p-4 bg-grey-500">
      {content ?? <div className="text-gray-500 italic">No content on right</div>}
    </aside>
  );
};

export default SidebarRight;
