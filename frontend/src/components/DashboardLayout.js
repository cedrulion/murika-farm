import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaChevronDown, FaUser } from "react-icons/fa";
import Lsidebar from "./Lsidebar";

const DashboardLayout = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve currentUser from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
      setUser(currentUser);
    } else {
      // If no currentUser, redirect to login (or handle as appropriate)
      navigate("/login");
    }
  }, [navigate]); // Add navigate to dependency array

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser"); // Also remove currentUser
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex h-screen" style={{ fontFamily: "Roboto, sans-serif" }}>
      {/* Sidebar */}
      <Lsidebar className="mr-5" />

      {/* Main Content */}
      <div className="flex flex-col flex-grow">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-3 shadow-sm bg-white w-full">
          {/* User Dropdown (Right-aligned) */}
          <div className="ml-auto relative">
            <div
              className="flex items-center space-x-3 cursor-pointer bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <FaUser className="text-gray-500 text-xs" />
              <div className="text-sm font-semibold">
                {user?.firstName || "Loading..."}
              </div>
              <FaChevronDown className="text-gray-500 text-xs" />
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white shadow-md rounded-md border">
                <div className="px-4 py-2 text-gray-700">{user?.role || "User"}</div>
                <hr />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Outlet */}
        <div className="flex-grow bg-white p-4 ml-60">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;