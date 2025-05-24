import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { auth } from "../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import supabase from "./supabaseClient";

const uploadImageToSupabase = async (uri) => {
  const fileName = uri.split("/").pop();
  const fileExt = fileName.split(".").pop().toLowerCase();
  const fileType =
    fileExt === "jpg" || fileExt === "jpeg"
      ? "image/jpeg"
      : fileExt === "png"
      ? "image/png"
      : null;

  if (!fileType) {
    Alert.alert("File Error", "Unsupported file type.");
    return null;
  }

  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from("images")
      .upload(`profiles/${auth.currentUser.uid}_${fileName}`, buffer, {
        contentType: fileType,
      });

    if (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Error", error.message);
      return null;
    }

    const { data: publicData, error: urlError } = supabase.storage
      .from("images")
      .getPublicUrl(data.path);

    if (urlError) {
      console.error("URL Error:", urlError);
      return null;
    }

    return publicData.publicUrl;
  } catch (err) {
    console.error("Unexpected Error:", err);
    Alert.alert("Error", err.message);
    return null;
  }
};

export default function ProfileSettings({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const db = getDatabase();
    const userRef = ref(db, `users/${currentUserId}`); // Replace 'yourUserId' with the actual user ID
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsername(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setProfileImage(data.picture || null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = () => {
    const db = getDatabase();
    const userRef = ref(db, `users/${currentUserId}`); // Replace 'yourUserId' with the actual user ID

    update(userRef, {
      name: username,
      email: email,
      phone: phone,
      picture: profileImage,
    })
      .then(() => {
        console.log("Profile updated successfully");
        navigation.goBack(); // Navigate back to the previous screen
      })
      .catch((error) => {
        console.error("Error updating profile:", error);
      });
  };

  const updateProfileImage = async (uri) => {
    const uploadedImageUrl = await uploadImageToSupabase(uri);
    if (!uploadedImageUrl) return;

    setLoading(true);
    try {
      setProfileImage(uploadedImageUrl);
    } catch (err) {
      console.error("Error updating profile image:", err);
      Alert.alert("Error", "Could not update profile image.");
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      updateProfileImage(result.assets[0].uri);
    }
  };

  const avatarInitial = username ? username[0].toUpperCase() : "?";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Settings</Text>
      <TouchableOpacity onPress={pickImageFromGallery}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            {profileImage ? (
              <Image
                source={profileImage && { uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            )}
          </View>
        </View>
        <View style={styles.iconContainer}>
          <Icon name="edit" size={24} color="#25D366" />
        </View>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TouchableOpacity style={styles.button} onPress={handleSaveSettings}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  iconContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    width: "80%",
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6200ee",
    padding: 15,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6200ee",
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
});
