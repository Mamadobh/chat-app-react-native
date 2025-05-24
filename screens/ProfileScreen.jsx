import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { getDatabase, ref, onValue } from "firebase/database";
import { auth } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const db = getDatabase();
    const userRef = ref(db, `users/${currentUserId}`); // Replace 'yourUserId' with the actual user ID
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      setProfile(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>No profile data found.</Text>
      </View>
    );
  }

  const { name, email, phone, picture } = profile;
  const avatarInitial = name ? name[0].toUpperCase() : "?";

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          {picture ? (
            <Image
              source={picture && { uri: picture }}
              style={styles.profileImage}
            />
          ) : (
            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
          )}
        </View>
      </View>
      <View style={styles.profileDetails}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        <Text style={styles.profilePhone}>{phone}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("ProfileSettings")}>
        <Image source={require("../assets/icon.png")} style={styles.addIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    alignItems: "center",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#ffffff",
    marginBottom: 10,
  },
  loadingContainer: {
    justifyContent: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#777",
  },
  avatarContainer: {
    marginTop: 50,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6200ee",
  },
  profileDetails: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  profileEmail: {
    fontSize: 16,
    color: "#777",
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 16,
    color: "#777",
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#6200ee",
    borderRadius: 50,
    padding: 15,
  },
  addIcon: {
    width: 30,
    height: 30,
    tintColor: "#fff",
  },
});

export default ProfileScreen;
