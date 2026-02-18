import { createSlice } from "@reduxjs/toolkit";

const storedUser = localStorage.getItem("user");
const initialUser = storedUser ? JSON.parse(storedUser) : null;

const initialState = {
  username: initialUser?.username || null,
  token: initialUser?.token || null,
  isLoggedIn: !!initialUser,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action) => {
      state.username = action.payload.username;
      state.token = action.payload.token;
      state.isLoggedIn = true;
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: action.payload.username,
          token: action.payload.token,
        })
      );
    },
    logout: (state) => {
      state.username = null;
      state.token = null;
      state.isLoggedIn = false;
      localStorage.removeItem("user");
    },
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;
