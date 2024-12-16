import React, {createContext, useState, useEffect} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {ActivityIndicator, View, StyleSheet} from "react-native";
import {auth} from "../firebaseConfig";
import {signInWithEmailAndPassword} from "firebase/auth";
import {getDatabase, ref, update} from "firebase/database";

const LoadingSpinner = ({size = "large", color = "#6200ee"}) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color}/>
        </View>
    );
};
export const AuthContext = createContext();

export function AuthProvider({children}) {
    const [isLoggedIn, setIsLoggedIn] = useState(null);


        useEffect(() => {
            const checkLoginState = async () => {
                try {
                    const loggedIn = await AsyncStorage.getItem("loggedIn");
                    const email = await AsyncStorage.getItem("email");
                    const password = await AsyncStorage.getItem("password");

                    if (loggedIn === "true" && email && password) {
                        await login(true, email, password); // Attempt auto-login
                    } else {
                        setIsLoggedIn(false);
                    }
                } catch (error) {
                    console.error("Error reading AsyncStorage:", error);
                    setIsLoggedIn(false);
                }
            };
            checkLoginState();
        }, []);

        const login = async (rememberMe, email, password) => {
            try {
                await signInWithEmailAndPassword(auth, email, password);
                if (rememberMe) {
                    await AsyncStorage.setItem("loggedIn", "true");
                    await AsyncStorage.setItem("email", email);
                    await AsyncStorage.setItem("password", password);
                }
                setIsLoggedIn(true);
            } catch (error) {
                console.error("Login error:", error.message);
                throw error; // To handle in the caller
            }
        };
    const logout = async () => {
        await AsyncStorage.multiRemove(["loggedIn", "email", "password"]);
        const currentUserId = auth.currentUser?.uid;
        if (currentUserId) {
            // Get a reference to the user's data in the database
            const db = getDatabase(); // Ensure Firebase is initialized correctly
            const userRef = ref(db, `users/${currentUserId}`);
            // Update the "online" status to false
            await update(userRef, {online: false});
        }
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{isLoggedIn, login, logout}}>
            {isLoggedIn != null ? children : <LoadingSpinner/>}
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
