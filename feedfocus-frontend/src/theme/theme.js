import { createTheme } from "@mui/material/styles";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5e4b8b",
      contrastText: "#fff",
    },
    secondary: {
      main: "#7b7f9e",
    },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
      navbar: "#f0f4f8",
      footer: "#f5f5f5",
    },
    text: {
      primary: "#222831",
      secondary: "#555a77",
      icon: "#222831",
      iconActive: "#4a3a70",
      title: "#222831",
      buttonBorder: "#5e4b8b",
      buttonText: "#5e4b8b",
      footer: "#333",
    },
    divider: "#e0e0e0",
    action: {
      hover: "#f0f0f0",
      selected: "#e7eaf3",
      disabled: "#bdbdbd",
      disabledBackground: "#f5f5f5",
    },
    success: { main: "#4caf50" },
    error: { main: "#e57373" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h6: { color: "#222831", fontWeight: "bold" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#f0f4f8",
          color: "#222831",
          boxShadow: "0 2px 8px 0 #e7eaf3",
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: "#222831",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: "#5e4b8b",
          color: "#fff",
          width: 40,
          height: 40,
          fontWeight: 700,
          fontSize: 20,
          borderRadius: "50%",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: "none",
          fontWeight: 500,
          fontSize: 16,
          boxShadow: "none",
        },
        contained: {
          background: "linear-gradient(90deg, #4a3a70 0%, #555a77 100%)",
          color: "#fff",
          border: "2px solid #5e4b8b",
          "&:hover": {
            background: "linear-gradient(90deg, #4a3a70 0%, #555a77 100%)",
            borderColor: "#4a3a70",
            color: "#fff",
          },
          "&:active": {
            background: "#3b2e5a",
            borderColor: "#3b2e5a",
            color: "#fff",
          },
        },
        outlined: {
          backgroundColor: "#fff",
          color: "#5e4b8b",
          border: "2px solid #5e4b8b",
          "&:hover": {
            backgroundColor: "#f0f0f0",
            color: "#4a3a70",
            borderColor: "#4a3a70",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(94, 75, 139, 0.08)",
          backgroundColor: "#fff",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          textTransform: "capitalize",
          backgroundColor: "#e7eaf3",
          color: "#5e4b8b",
          "&:hover": {
            backgroundColor: "#d0d7e8",
            color: "#4a3a70",
          },
          "&.MuiChip-filled": {
            backgroundColor: "#5e4b8b",
            color: "#fff",
          },
          "&.MuiChip-filled:hover": {
            backgroundColor: "#4a3a70",
            color: "#fff",
          },
          "&.MuiChip-filled.MuiChip-colorPrimary": {
            backgroundColor: "#5e4b8b",
            color: "#fff",
          },
          "&.MuiChip-filled.MuiChip-colorPrimary:hover": {
            backgroundColor: "#4a3a70",
            color: "#fff",
          },
          "&:focus-visible": {
            outline: "2px solid #6f58a7",
            outlineOffset: "2px",
          },
          "&:active": {
            backgroundColor: "#3b2e5a",
            color: "#fff",
          },
          "&:focus:not(:focus-visible)": {
            outline: "none",
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h6: {
          color: "#222831",
          fontWeight: "bold",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#e0e0e0",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#a593e0",
      contrastText: "#181825",
    },
    secondary: {
      main: "#999ec3",
    },
    background: {
      default: "#181825",
      paper: "#232336",
      navbar: "#232336",
      footer: "#181825",
    },
    text: {
      primary: "#f4f4fa",
      secondary: "#b2b3c1",
      icon: "#a593e0",
      iconActive: "#d1c4e9",
      title: "#f4f4fa",
      buttonBorder: "#a593e0",
      buttonText: "#a593e0",
      footer: "#f4f4fa",
    },
    divider: "#2c2b3d",
    action: {
      hover: "#232336",
      selected: "#312f4e",
      disabled: "#555a77",
      disabledBackground: "#232336",
    },
    success: { main: "#81c784" },
    error: { main: "#ef9a9a" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h6: { color: "#f4f4fa", fontWeight: "bold" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#232336",
          color: "#f4f4fa",
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: "#f4f4fa",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: "#a593e0",
          color: "#181825",
          width: 40,
          height: 40,
          fontWeight: 700,
          fontSize: 20,
          borderRadius: "50%",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: "none",
          fontWeight: 500,
          fontSize: 16,
          boxShadow: "none",
        },
        contained: {
          background: "linear-gradient(90deg, #a593e0 0%, #999ec3 100%)",
          color: "#181825",
          border: "2px solid #a593e0",
          "&:hover": {
            background: "linear-gradient(90deg, #8079b9 0%, #555a77 100%)",
            borderColor: "#8079b9",
            color: "#181825",
          },
          "&:active": {
            background: "#6a5fb3",
            borderColor: "#6a5fb3",
            color: "#181825",
          },
        },
        outlined: {
          backgroundColor: "transparent",
          color: "#a593e0",
          border: "2px solid #a593e0",
          "&:hover": {
            backgroundColor: "#232336",
            color: "#d1c4e9",
            borderColor: "#d1c4e9",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(165, 147, 224, 0.12)",
          backgroundColor: "#232336",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          textTransform: "capitalize",
          backgroundColor: "#312f4e",
          color: "#a593e0",
          "&:hover": {
            backgroundColor: "#3e3b64",
            color: "#d1c4e9",
          },
          "&.MuiChip-filled": {
            backgroundColor: "#a593e0",
            color: "#181825",
          },
          "&.MuiChip-filled:hover": {
            backgroundColor: "#8079b9",
            color: "#181825",
          },
          "&.MuiChip-filled.MuiChip-colorPrimary": {
            backgroundColor: "#a593e0",
            color: "#181825",
          },
          "&.MuiChip-filled.MuiChip-colorPrimary:hover": {
            backgroundColor: "#8079b9",
            color: "#181825",
          },
          "&:focus-visible": {
            outline: "2px solid #9a8fe5",
            outlineOffset: "2px",
          },
          "&:active": {
            backgroundColor: "#6a5fb3",
            color: "#181825",
          },
          "&:focus:not(:focus-visible)": {
            outline: "none",
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h6: {
          color: "#f4f4fa",
          fontWeight: "bold",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#2c2b3d",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

export { lightTheme, darkTheme };
