import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useEffect, useState } from "react";
import {
  getDatabase,
  ref,
  onValue,
  off,
  push,
  set,
  serverTimestamp,
} from "firebase/database";
import { auth } from "../firebaseConfig";
import * as ImagePicker from "expo-image-picker";

import * as DocumentPicker from "expo-document-picker"; // Import Document Picker
import { Ionicons, MaterialIcons } from "react-native-vector-icons"; // Import vector icons
import * as Location from "expo-location"; // Import Location API
import { useNavigation } from "@react-navigation/native";

import supabase from "./supabaseClient"; // Import the Supabase client

export default function ChatScreen({ route }) {
  const { contactId, name, avatar } = route.params;
  const currentUserId = auth.currentUser?.uid;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatId = [contactId, currentUserId].sort().join("_");
  const [otherIsTyping, setOtherIsType] = useState(false);
  const [contactInfos, setContactInfos] = useState(null);
  const [file, setFile] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const navigation = useNavigation();

  // Fetch contact information
  useEffect(() => {
    const database = getDatabase();
    const contactRef = ref(database, `users/${contactId}`);

    const unsubscribe = onValue(contactRef, (snapshot) => {
      if (snapshot.exists()) {
        setContactInfos(snapshot.val());
      } else {
        console.warn("Contact information not found");
      }
    });

    return () => off(contactRef, "value", unsubscribe); // Cleanup listener on unmount
  }, [contactId]);

  useEffect(() => {
    const database = getDatabase();
    const typingRef = ref(database, `chats/${chatId}/typingStates`);

    // Listen for typing states
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const typingStates = snapshot.val();
        setOtherIsType(typingStates[contactId] || false); // Update other user's typing state
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [currentUserId, contactId]);

  const handleInputChange = (text) => {
    updateTypingState(true); // Set current user as typing
  };

  const handleEndEditing = () => {
    updateTypingState(false); // Set current user as not typing
  };

  const updateTypingState = async (isTyping) => {
    const database = getDatabase();
    const typingRef = ref(database, `chats/${chatId}/typingStates`);

    // Update typing state for the current user
    await set(typingRef, {
      [currentUserId]: isTyping,
      [contactId]: otherIsTyping,
    });
  };

  useEffect(() => {
    const db = getDatabase();
    const chatRef = ref(db, `chats/${chatId}/messages`);
    // Listen for new messages
    const onValueChange = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array
        const parsedMessages = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setMessages(parsedMessages);
      }
    });

    // Cleanup listener on unmount
    return () => off(chatRef, "value", onValueChange);
  }, [chatId]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" && !file) {
      Alert.alert(
        "Validation Error",
        "Please enter a message or select a file."
      );
      return;
    }

    let fileUrl = ""; // This will store the URL of the uploaded file

    try {
      // Upload the file if selected
      if (file) {
        if (file.type === "image") {
          fileUrl = await uploadImageToSupabase(file.uri);
        } else {
          fileUrl = await uploadFileToSupabase(file.uri, file.name, file.type);
        }

        if (!fileUrl) {
          Alert.alert("File Upload Failed", "Unable to upload the file.");
          return;
        }
      }

      // Construct the new message object
      const newMessageData = {
        sender: currentUserId,
        text: newMessage.trim(),
        timestamp: Date.now(),
        file: fileUrl
          ? { uri: fileUrl, type: file.type, name: file.name }
          : null,
      };

      // Save the message to the Firebase database
      const database = getDatabase();
      const chatRef = ref(database, `chats/${chatId}/messages`);

      await push(chatRef, newMessageData);

      // Reset the input fields after sending the message
      setNewMessage("");
      setFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Send Error", error.message);
    }
  };

  const handleCall = () => {
    if (contactInfos?.phone) {
      Linking.openURL(`tel:${contactInfos.phone}`).catch((err) =>
        console.error("Failed to make a call:", err)
      );
    } else {
      console.warn("Phone number is not available");
    }
  };

  const deleteChat = async () => {
    try {
      const database = getDatabase();

      const chatRef = ref(database, `chats/${chatId}`);

      // Confirm before deleting
      Alert.alert("Delete Chat", "Are you sure you want to delete this chat?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            // Delete the chat
            await set(chatRef, null);

            // Navigate to Chats
            navigation.navigate("MainTabs", { screen: "Home" });
          },
          style: "destructive",
        },
      ]);
    } catch (error) {
      console.error("Error deleting group:", error);
      Alert.alert("Delete Error", error.message);
    }
  };

  const pickImageFromGallery = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need permission to access your library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        type: "image",
      });
    }
  };

  const takePhoto = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need permission to access camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        type: "image",
      });
    }
  };

  const uploadFileToSupabase = async (uri, name, mimeType) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data, error } = await supabase.storage
        .from("images")
        .upload(`files/${Date.now()}_${name}`, buffer, {
          contentType: mimeType,
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
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*", // Allow all file types
      copyToCacheDirectory: true,
    });

    // Check if the result is successful and contains assets
    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0]; // Get the first file from the assets array

      setFile({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream", // Fallback MIME type
      });
    } else {
      setFile(null); // If no file selected or operation failed
    }
  };

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
        .upload(`images/${Date.now()}_${fileName}`, buffer, {
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

  const sendLocation = async () => {
    setLocationLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need location access to share it."
        );
        setLocationLoading(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      const newMessage = {
        sender: currentUserId,
        text: `🗺️ Location: ${locationUrl}`,
        timestamp: Date.now(),
        file: null,
      };

      const database = getDatabase();
      const chatKey = [currentUserId, contactId].sort().join("_");
      const messagesRef = ref(database, `chats/${chatKey}/messages`);

      await set(push(messagesRef), newMessage);
    } catch (error) {
      console.error("Error sharing location:", error);
      Alert.alert("Location Error", error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Image source={require("../assets/icon.png")} style={styles.avatar} />
        <Text style={styles.chatName}>{name}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={deleteChat}>
          <Ionicons name="trash" size={24} color="red" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Ionicons name="call-outline" size={24} color="#6200ee" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View
            style={
              item.sender === currentUserId
                ? styles.sentMessage
                : styles.receivedMessage
            }>
            <Text
              style={
                item.sender === currentUserId
                  ? styles.messageTextSent
                  : styles.messageTextRecive
              }>
              {item.text.includes("https://www.google.com/maps") ? (
                <Text
                  style={{ color: "blue" }}
                  onPress={() =>
                    Linking.openURL(item.text.replace("🗺️ Location: ", ""))
                  }>
                  {item.text}
                </Text>
              ) : (
                item.text
              )}
            </Text>
            {item.file &&
              (item.file.type === "image" ? (
                <Image
                  source={{ uri: item.file.uri }}
                  style={styles.messageImage}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item.file.uri)}>
                  <MaterialIcons
                    name="insert-drive-file"
                    size={50}
                    color="#3498db"
                  />
                  <Text style={styles.fileName}>{item.file.name}</Text>
                </TouchableOpacity>
              ))}
            <Text style={styles.messageTime}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      {otherIsTyping && (
        <Text style={styles.typingIndicator}>{name} is typing...</Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={newMessage || (file?.type === "image" ? "" : file?.name)}
          onChangeText={setNewMessage}
          onFocus={handleInputChange}
          onBlur={handleEndEditing}
        />

        <TouchableOpacity style={styles.sendButton} onPress={pickFile}>
          <MaterialIcons name="attach-file" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.sendButton}>
          <Ionicons name="image-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <Modal
          transparent={true}
          animationType="slide"
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={pickImageFromGallery}>
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Text style={styles.modalButtonText}>Take a Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#e74c3c" }]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <TouchableOpacity
          onPress={sendLocation}
          style={[styles.sendButton]}
          disabled={locationLoading}>
          <Ionicons name="location-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
        {/* Existing file preview */}
      </View>
      {file && file.type === "image" && (
        <Image
          source={{ uri: file.uri }}
          style={{ width: 100, height: 100, marginTop: 10 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputArea: {},
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messageImage: {
    width: 200,
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 35,
    paddingBottom: 10,
    paddingInline: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  callButton: {
    padding: 5,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sentMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#6200ee",
    padding: 10,
    margin: 5,
    borderRadius: 10,
    maxWidth: "75%",
  },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ddd",
    padding: 10,
    margin: 5,
    borderRadius: 10,
    maxWidth: "75%",
  },
  messageTextSent: {
    color: "#fff",
  },
  messageTextRecive: {
    color: "#2a2727",
  },
  messageTime: {
    fontSize: 12,
    color: "#bbb",
    textAlign: "right",
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "center",
  },
  input: {
    flex: 1,
    flexGrow: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#6200ee",
    marginLeft: 4,
    padding: 10,
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  typingIndicator: {
    textAlign: "center",
    color: "#777",
    padding: 5,
  },
});
