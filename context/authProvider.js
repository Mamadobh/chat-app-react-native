import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import {auth} from "../firebaseConfig";
import {signInWithEmailAndPassword} from "firebase/auth";
import {getDatabase, ref, update} from "firebase/database";

const LoadingSpinner = ({ size = "large", color = "#6200ee" }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    const checkLoginState = async () => {
      const loginState = await AsyncStorage.getItem("loggedIn");
      setIsLoggedIn(loginState === "true");
    };
    checkLoginState();
  }, []);

  const login = async (rememberMe,email,password) => {
    const currentUserId = auth.currentUser?.uid;
    if(!currentUserId){
     try {
       await signInWithEmailAndPassword(auth, email, password)
     }
     catch (e){
       console.log(e.message())
     }
    }

    await AsyncStorage.setItem("loggedIn", rememberMe + "");

    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.setItem("loggedIn", "false");
    const currentUserId = auth.currentUser?.uid;
    if (currentUserId) {
      // Get a reference to the user's data in the database
      const db = getDatabase(); // Ensure Firebase is initialized correctly
      const userRef = ref(db, `users/${currentUserId}`);
      // Update the "online" status to false
      await update(userRef, { online: false });
    }
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {isLoggedIn != null ? children : <LoadingSpinner />}
    </AuthContext.Provider>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5", // Optional, adjust according to your UI
  },
});
