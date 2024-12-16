import {View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image} from 'react-native';
import {Ionicons} from '@expo/vector-icons'; // For icons
import React, {useEffect, useState} from 'react';
import {getDatabase, ref, onValue, off, push, set, serverTimestamp} from "firebase/database";
import {auth} from "../firebaseConfig";


export default function ChatScreen({route}) {
    const {contactId, name, avatar} = route.params;
    const currentUserId = auth.currentUser?.uid;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatId = [contactId, currentUserId].sort().join(("_"))
    const [otherIsTyping, setOtherIsType] = useState(false)
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
        await set(typingRef, {[currentUserId]: isTyping, [contactId]: otherIsTyping});
    };

    useEffect(() => {
        const db = getDatabase();
        const chatRef = ref(db, `chats/${chatId}/messages`);
        // Listen for new messages
        const onValueChange = onValue(chatRef, snapshot => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array
                const parsedMessages = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                }));
                setMessages(parsedMessages);
            }
        });

        // Cleanup listener on unmount
        return () => off(chatRef, 'value', onValueChange);
    }, [chatId]);

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const db = getDatabase();
            const chatRef = ref(db, `chats/${chatId}/messages`);
            const messageId = push(chatRef).key; // Generate a unique key for the message

            // Create message object
            const message = {
                text: newMessage,
                sender: auth.currentUser?.uid,
                timestamp: serverTimestamp(),
            };

            // Save message to the chat
            set(ref(db, `chats/${chatId}/messages/${messageId}`), message);
            setNewMessage(''); // Clear input
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image source={require("../assets/icon.png")} style={styles.avatar}/>
                <Text style={styles.chatName}>{name}</Text>
                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call-outline" size={24} color="#6200ee"/>
                </TouchableOpacity>
            </View>

            <FlatList
                data={messages}
                renderItem={({item}) => (
                    <View style={item.sender === currentUserId ? styles.sentMessage : styles.receivedMessage}>
                        <Text
                            style={item.sender === currentUserId ? styles.messageTextSent : styles.messageTextRecive}>{item.text}</Text>
                        <Text style={styles.messageTime}>
                            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </Text>
                    </View>
                )}
                keyExtractor={(item) => item.id}
            />
            {otherIsTyping && <Text> is Typing ...</Text>}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onFocus={handleInputChange}
                    onBlur={handleEndEditing}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Ionicons name="send" size={20} color="#fff"/>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',

    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 35,
        paddingBottom: 10,
        paddingInline: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: '#f5f5f5',
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
        fontWeight: 'bold',
        color: '#333',
    },
    callButton: {
        padding: 5,
    },
    messageList: {
        flex: 1,
        paddingHorizontal: 10,
    },
    sentMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#6200ee',
        padding: 10,
        margin: 5,
        borderRadius: 10,
        maxWidth: '75%',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ddd',
        padding: 10,
        margin: 5,
        borderRadius: 10,
        maxWidth: '75%',
    },
    messageTextSent: {
        color: '#fff',
    },
    messageTextRecive: {
        color: "#2a2727",
    },
    messageTime: {
        fontSize: 12,
        color: '#bbb',
        textAlign: 'right',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    sendButton: {
        backgroundColor: '#6200ee',
        marginLeft: 10,
        padding: 10,
        borderRadius: 10,
    },
});
