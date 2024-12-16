import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
} from "firebase/database";
import { getAuth } from "firebase/auth";

export default function HomePage() {
  const navigation = useNavigation();
  const [combinedChats, setCombinedChats] = useState([]);
  const currentUser = getAuth().currentUser;

  // Unified function to fetch and update chats and groups with real-time listening
  const fetchAndListenToChatsAndGroups = useCallback(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const chatsRef = ref(db, "chats");
    const groupsRef = ref(db, "groups");
    const usersRef = ref(db, users/${currentUser.uid}/contactList);
    let chatsArray =
      // Fetch contacts first
      onValue(usersRef, (contactSnapshot) => {
        const contactsData = contactSnapshot.val() || {};
        let chatsArray;
        // Listen to chats
        onValue(chatsRef, (chatsSnapshot) => {
          chatsArray = [];
          chatsSnapshot.forEach((chatSnapshot) => {
            const chatId = chatSnapshot.key;
            const chat = chatSnapshot.val();

            // Check if current user is part of the chat
            if (chatId.includes(currentUser.uid) && chat.messages) {
              // Find the other user's ID
              const otherUserId = chatId
                .split("_")
                .find((id) => id !== currentUser.uid);

              // Get the last message
              const messagesArray = Object.values(chat.messages);
              const lastMessage =
                messagesArray.length > 0
                  ? messagesArray.reduce((a, b) =>
                      a.timestamp > b.timestamp ? a : b
                    )
                  : null;
              console.log("last messgaes", lastMessage);
              // Get contact pseudo or use a fallback
              const contactPseudo =
                contactsData[otherUserId]?.pseudo || "Unknown User";

              if (lastMessage) {
                chatsArray.push({
                  id: chatId,
                  name: contactPseudo,
                  lastMessage: lastMessage,
                  isGroup: false,
                  timestamp: lastMessage.timestamp,
                });
              }
            }
          });
          let groupsArray;
          // Listen to groups
          onValue(groupsRef, (groupsSnapshot) => {
            const groupsArray = [];

            groupsSnapshot.forEach((groupSnapshot) => {
              const group = groupSnapshot.val();
              const groupId = groupSnapshot.key;

              // Check if current user is a group member
              if (group.members?.includes(currentUser.uid)) {
                // Find the group's messages
                const groupChatsRef = ref(db, chats/${groupId}__/messages);

                onValue(groupChatsRef, (groupMessagesSnapshot) => {
                  const groupMessagesArray = [];
                  groupMessagesSnapshot.forEach((messageSnapshot) => {
                    groupMessagesArray.push(messageSnapshot.val());
                  });

                  const lastMessage =
                    groupMessagesArray.length > 0
                      ? groupMessagesArray.reduce((a, b) =>
                          a.timestamp > b.timestamp ? a : b
                        )
                      : null;

                  if (lastMessage) {
                    groupsArray.push({
                      id: groupId,
                      name: group.name || "Unnamed Group",
                      lastMessage: lastMessage,
                      isGroup: true,
                      timestamp: lastMessage.timestamp,
                    });
                  }
                  // Combine and sort chats and groups
                });
              }
            });
            const combinedData = [...chatsArray, ...groupsArray].sort(
              (a, b) => b.timestamp - a.timestamp
            );
            console.log("combinedData", chatsArray);

            setCombinedChats(combinedData);
          });
        });
      });
  }, [currentUser]);

  useEffect(() => {
    fetchAndListenToChatsAndGroups();
  }, [fetchAndListenToChatsAndGroups]);

  const handleChatClick = (item) => {
    if (item.isGroup) {
      navigation.navigate("ChatScreenGroup", {
        groupId: item.id,
        name: item.name,
      });
    } else {
      navigation.navigate("ChatScreen", {
        chatId: item.id,
        name: item.name,
        contactId: item.id.split("_").find((id) => id !== currentUser.uid),
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>
      {combinedChats.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No chats or groups yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start a conversation by adding a contact
          </Text>
        </View>
      ) : (
        <FlatList
          data={combinedChats}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => handleChatClick(item)}>
              <View style={styles.chatDetails}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatLastMessage}>
                  {item.lastMessage.file
                    ? item.lastMessage.file.type === "image"
                      ? "Image sent"
                      : "File sent"
                    : item.lastMessage.text}
                </Text>
              </View>
              <Text style={styles.chatTime}>
                {item.lastMessage?.timestamp
                  ? new Date(item.lastMessage.timestamp).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : ""}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddContact")}>
        <Image source={require("../assets/icon.png")} style={styles.addIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  chatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  chatDetails: {
    flex: 1,
  },
  chatName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  chatLastMessage: {
    color: "#666",
    fontSize: 14,
  },
  chatTime: {
    fontSize: 12,
    color: "#888",
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