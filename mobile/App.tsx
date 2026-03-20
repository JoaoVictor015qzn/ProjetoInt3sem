import React, { useState } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import { UserInfo } from "./src/services/api";

export default function App() {
  const [loggedUser, setLoggedUser] = useState<UserInfo | null>(null);

  if (loggedUser) {
    return (
      <DashboardScreen
        user={loggedUser}
        onLogout={() => setLoggedUser(null)}
      />
    );
  }

  return <LoginScreen onLoginSuccess={setLoggedUser} />;
}
