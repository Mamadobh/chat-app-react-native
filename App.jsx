import React, { useContext } from "react";
import { NavigationContainer, TabActions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";
import HomePage from "./screens/HomePage";
import ContactsScreen from "./screens/ContactsScreen";
import ProfileSettings from "./screens/ProfileSettings";
import { AuthContext, AuthProvider } from "./context/authProvider";
import { Pressable, StyleSheet, Text } from "react-native";
import ChatScreen from "./screens/ChatScreen";
import AddContactScreen from "./screens/AddContactScreen";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import CreateGroupScreen from "./screens/CreateGroupScreen";
import ChatScreenGroup from "./screens/ChatScreenGroup";
import ProfileScreen from "./screens/ProfileScreen";
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
function MainTabs() {
  const { logout } = useContext(AuthContext);
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerRight: () => (
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && { backgroundColor: "#e0e0e0" },
              ]}>
              <Ionicons name="log-out-outline" size={20} color="#6200ee" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          ),
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "Home") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
            } else if (route.name === "Contacts") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Groups") {
              iconName = focused ? "albums" : "albums-outline";
            } else if (route.name === "ProfileScreen") {
              iconName = focused ? "settings" : "settings-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#6200ee",
          tabBarInactiveTintColor: "gray",
        })}>
        <Tab.Screen name="Home" component={HomePage} />
        <Tab.Screen name="Contacts" component={ContactsScreen} />
        {/*<Tab.Screen name="Groups" component={GroupsScreen} />*/}
        <Tab.Screen name="ProfileScreen" component={ProfileScreen} />
      </Tab.Navigator>
    </>
  );
}

function AppNavigator() {
  const { isLoggedIn } = useContext(AuthContext);

  return (
    <NavigationContainer>
          <Stack.Navigator screenOptions={{
              headerShown: false,
              animationEnabled: true,
             gestureEnabled: true, 
          

       }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
              <Stack.Screen name="AddContact" component={AddContactScreen} />
              <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
              <Stack.Screen name="ChatScreenGroup" component={ChatScreenGroup} />
              <Tab.Screen name="ProfileSettings" component={ProfileSettings} />


          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    padding: 5,
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 5,
    color: "#6200ee",
    fontSize: 16,
    fontWeight: "500",
  },
});
