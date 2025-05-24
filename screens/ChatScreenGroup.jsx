import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    Modal,
    Alert
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {getDatabase, ref, onValue, off, push, set, serverTimestamp} from "firebase/database";
import {auth} from "../firebaseConfig";

export default function ChatScreenGroup({route}) {
    const {groupId, name, avatar} = route.params;
    const currentUserId = auth.currentUser?.uid;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherIsTyping, setOtherIsType] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [groupMembers, setGroupMembers] = useState([]);

    // Fetch group members

    useEffect(() => {
        const db = getDatabase();
        const groupMembersRef = ref(db, `chats/${groupId}__/users`);

        // Listener for group members
        const unsubscribe = onValue(groupMembersRef, async (snapshot) => {
            if (snapshot.exists()) {
                const memberIds = Object.values(snapshot.val()); // Get member IDs



                const memberDetails = await Promise.all(
                    memberIds.map(async (memberId) => {
                        const userRef = ref(db, `users/${memberId}`);
                        try {
                            const userSnapshot = await new Promise((resolve, reject) =>
                                onValue(userRef, resolve, { onlyOnce: true })
                            );

                            if (userSnapshot.exists()) {
                                return { id: memberId, ...userSnapshot.val() };
                            } else {
                                return { id: memberId, name: "Unknown User" }; // Fallback
                            }
                        } catch (e) {
                            console.log("the error is ", e.message);
                            return { id: memberId, name: "Error fetching user" }; // Fallback on error
                        }
                    })
                );
                setGroupMembers(memberDetails); // Update state with fetched data
            } else {
                setGroupMembers([]); // Clear members if none exist
            }
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [groupId]);

    useEffect(() => {
        groupMembers.forEach((el)=>console.log(el.name))

    }, [groupMembers]);


    // Typing state management
    useEffect(() => {
        const database = getDatabase();
        const typingRef = ref(database, `chats/${groupId}__/typingStates`);

        const unsubscribe = onValue(typingRef, (snapshot) => {
            if (snapshot.exists()) {
                const typingStates = snapshot.val();
                const typingMembers = Object.keys(typingStates || {})
                    .filter(memberId => typingStates[memberId] && memberId !== currentUserId);
                setOtherIsType(typingMembers.length > 0);
            }
        });

        return () => unsubscribe();
    }, [currentUserId, groupId]);

    const handleInputChange = () => {
        updateTypingState(true);
    };

    const handleEndEditing = () => {
        updateTypingState(false);
    };

    const updateTypingState = async (isTyping) => {
        const database = getDatabase();
        const typingRef = ref(database, `chats/${groupId}__/typingStates`);

        // Update typing state for the current user
        await set(typingRef, {[currentUserId]: isTyping});
    };

    // Message fetching
    useEffect(() => {
        const db = getDatabase();
        const chatRef = ref(db, `chats/${groupId}__/messages`);
        const onValueChange = onValue(chatRef, snapshot => {
            const data = snapshot.val();
            if (data) {
                const parsedMessages = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                }));
                setMessages(parsedMessages);
            }
        });

        return () => off(chatRef, 'value', onValueChange);
    }, [groupId]);

    // Send message
    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const db = getDatabase();
            const chatRef = ref(db, `chats/${groupId}__/messages`);
            const messageId = push(chatRef).key;

            const message = {
                text: newMessage,
                sender: currentUserId,
                timestamp: serverTimestamp(),
            };

            set(ref(db, `chats/${groupId}__/messages/${messageId}`), message);
            setNewMessage('');
        }
    };

    // Message details modal
    const openMessageDetails = (message) => {
        if (message.sender !== currentUserId) {
            setSelectedMessage(message===selectedMessage?{}:message);
        }
    };

    const closeMessageDetails = () => {
        setSelectedMessage(null);
    };

    // Render message with sender info modal

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <Image source={require("../assets/icon.png")} style={styles.avatar}/>
                <Text style={styles.chatName}>{name}</Text>
                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call-outline" size={24} color="#6200ee"/>
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <FlatList
                data={messages}
                renderItem={({item}) => {

                    const senderName = groupMembers?.find((el)=>el?.id===item.sender)?.name?? "Unknown Sender";

                    return (
                        <View>

                            <TouchableOpacity
                                onPress={() => openMessageDetails(item)}
                                style={item.sender === currentUserId ? styles.sentMessage : styles.receivedMessage}
                            >
                                <Text
                                    style={item.sender === currentUserId ? styles.messageTextSent : styles.messageTextRecive}
                                >
                                    {item.text}
                                </Text>
                                <Text style={styles.messageTime}>
                                    {new Date(item.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </TouchableOpacity>
                            {(item.sender !== currentUserId ) && (
                                <Text style={styles.senderIndicator}>
                                    Sent by {senderName}
                                </Text>
                            )}
                        </View>
                    );
                }}
                keyExtractor={(item) => item.id}
            />


            {/* Typing Indicator */}
            {otherIsTyping && <Text style={styles.typingIndicator}>Someone is typing...</Text>}

            {/* Input Container */}
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
    },
    modalCloseButton: {
        backgroundColor: '#6200ee',
        padding: 10,
        borderRadius: 5,
    },
    modalCloseText: {
        color: 'white',
        fontWeight: 'bold',
    },
    typingIndicator: {
        textAlign: 'center',
        color: '#777',
        padding: 5,
    }, senderIndicator: {
        fontSize: 12,
        color: '#555',
        marginBottom: 2,
        marginLeft: 5,
    },

});