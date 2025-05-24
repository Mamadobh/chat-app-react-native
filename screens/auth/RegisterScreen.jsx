import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform, Alert,
} from "react-native";
import { auth } from "../../firebaseConfig"; // Adjust the path as needed
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import * as ImagePicker from "expo-image-picker";
import supabase from "../supabaseClient";

const generateUniqueFileName = () => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomId}.jpg`;
};

const uploadImageToSupabase = async (uri) => {
  const fileName = generateUniqueFileName();
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
      .upload(`profile_images/${fileName}`, buffer, {
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

const ImagePickerComponent = ({ setProfileImage }) => {
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const uploadedImageUrl = await uploadImageToSupabase(uri);
        if (uploadedImageUrl) {
          setProfileImage(uploadedImageUrl);
          console.log(
            "Image uploaded and public URL obtained:",
            uploadedImageUrl
          );
        }
      }
    } catch (error) {
      console.error("Error picking or uploading image:", error);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
      <Text style={styles.galleryButtonText}>Pick Image</Text>
    </TouchableOpacity>
  );
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [profileImage, setProfileImage] = useState(null);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    console.log(name, phone, email);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save user information in Realtime Database
      const db = getDatabase();
      set(ref(db, `users/${user.uid}`), {
        name,
        phone,
        email,
        picture: profileImage,
      });

      console.log("User created successfully and saved to database");
      navigation.navigate("Login"); // Navigate to login screen after successful registration
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Create An Account</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry={true}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {profileImage && (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          )}
          <ImagePickerComponent setProfileImage={setProfileImage} />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Create An Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 16,
  },
  galleryButton: {
    backgroundColor: "#6200ee",
    padding: 10,
    marginTop: 16,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  galleryButtonText: { color: "white" },

  scrollViewContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  button: {
    backgroundColor: "#6200ee",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  linkText: {
    color: "#6200ee",
    fontSize: 14,
    marginTop: 15,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
});
