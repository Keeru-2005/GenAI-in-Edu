// File: src/components/Header.js
import React, { useContext, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Switch,
  Box,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import { ColorModeContext } from "../App";
import SettingsIcon from "@mui/icons-material/Settings";
import { UserContext } from "../context/UserContext";


function Header() {
  const colorMode = useContext(ColorModeContext);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Placeholder logout handler
  const handleLogout = () => {
    alert("Logged out (placeholder)");
  };
  const { activeUser, setActiveUser, users } = useContext(UserContext);


  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, userSelect: "none", fontWeight: "bold" }}
          aria-label="Adaptive Learning Agent Application Title"
        >
          Adaptive Learning Agent
        </Typography>

        <Tooltip title={`Switch to ${colorMode.mode === "light" ? "dark" : "light"} mode`}>
          <Switch
            onChange={colorMode.toggleColorMode}
            checked={colorMode.mode === "dark"}
            inputProps={{ "aria-label": "toggle dark/light theme" }}
          />
        </Tooltip>

        <IconButton
          size="large"
          aria-label="account menu"
          aria-controls="profile-menu"
          aria-haspopup="true"
          onClick={handleProfileMenuOpen}
          color="inherit"
          edge="end"
        >
          <AccountCircleIcon />
        </IconButton>
        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          {users.map((user) => (
              <MenuItem
                key={user.user_id}
                selected={user.user_id === activeUser.user_id}
                onClick={() => {
                  setActiveUser(user);
                  handleMenuClose();
                }}
              >
                {user.name}
              </MenuItem>
            ))}

          <MenuItem
            onClick={() => {
              window.location.href = "/settings";
              handleMenuClose();
            }}
            aria-label="Open settings"
          >
            <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleLogout();
              handleMenuClose();
            }}
            aria-label="Logout"
          >
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default Header;