import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { getDatabase, ref, onValue, set, get } from "firebase/database";
import { auth } from "../firebaseConfig";
import { MaterialIcons } from '@expo/vector-icons';
import { Searchbar } from 'react-native-paper';

export default function ContactsScreen() {
    const navigation = useNavigation();
    const [contacts, setContacts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const db = getDatabase();
        const currentUserId = auth.currentUser?.uid;

        if (!currentUserId) {
            alert("User not logged in!");
            setLoading(false);
            return;
        }

        const contactListRef = ref(db, `users/${currentUserId}/contactList`);
        const groupsRef = ref(db, `groups`);

        const contactListeners = new Map();

        const fetchContactsAndGroups = () => {
            // Fetch individual contacts
            const unsubscribeContacts = onValue(contactListRef, (snapshot) => {
                if (!snapshot.exists()) {
                    setContacts([]);
                } else {
                    const contactList = snapshot.val();
                    const updatedContacts = [];

                    Object.entries(contactList).forEach(([contactId, contactInfo]) => {
                        const contactRef = ref(db, `users/${contactId}`);
                        if (!contactListeners.has(contactId)) {
                            const unsubscribe = onValue(contactRef, (contactSnapshot) => {
                                const userData = contactSnapshot.val();
                                const contactData = {
                                    id: contactId,
                                    pseudo: contactInfo.pseudo,
                                    email: userData?.email || '',
                                    online: userData?.online || false,
                                };

                                // Check if contact already exists to prevent duplicates
                                const existingContactIndex = updatedContacts.findIndex(
                                    contact => contact.id === contactId
                                );

                                if (existingContactIndex === -1) {
                                    updatedContacts.push(contactData);
                                } else {
                                    updatedContacts[existingContactIndex] = contactData;
                                }

                                setContacts([...updatedContacts]);
                            });
                            contactListeners.set(contactId, unsubscribe);
                        }
                    });
                }
            });

            // Fetch group data
            const unsubscribeGroups = onValue(groupsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const groupsData = snapshot.val();
                    const updatedGroups = Object.entries(groupsData).map(([groupId, groupInfo]) => {
                        const members = Object.keys(groupInfo.members || {});
                        const online = members.some((memberId) => {
                            const memberRef = ref(db, `users/${memberId}/online`);
                            let memberOnline = false;
                            onValue(memberRef, (memberSnapshot) => {
                                if (memberSnapshot.exists()) {
                                    memberOnline = memberSnapshot.val();
                                }
                            });
                            return memberOnline;
                        });
                        return {
                            id: groupId,
                            name: groupInfo.name,
                            members: groupInfo.members,
                            online,
                        };
                    });
                    setGroups(updatedGroups);
                } else {
                    setGroups([]);
                }
            });

            return () => {
                unsubscribeContacts();
                unsubscribeGroups();
                contactListeners.forEach((unsubscribe) => unsubscribe());
                contactListeners.clear();
            };
        };

        const cleanup = fetchContactsAndGroups();
        setLoading(false);

        return cleanup;
    }, []);

    // Enhanced search filtering
    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return contacts.filter(contact =>
            contact.pseudo.toLowerCase().includes(query) ||
            (contact.email && contact.email.toLowerCase().includes(query))
        );
    }, [contacts, searchQuery]);

    const filteredGroups = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return groups.filter(group =>
            group.name.toLowerCase().includes(query)
        );
    }, [groups, searchQuery]);

    const handleChatClick = async (contactId, contactName) => {
        const currentUserId = auth.currentUser?.uid;
        const chatId = [currentUserId, contactId].sort().join("_");

        const db = getDatabase();
        const chatRef = ref(db, `chats/${chatId}`);

        try {
            const snapshot = await get(chatRef);
            if (!snapshot.exists()) {
                const newChat = {
                    users: [currentUserId, contactId],
                    messages: [],
                };
                await set(chatRef, newChat);
            }
        } catch (e) {
            console.error("Error creating chat:", e.message);
        }

        navigation.navigate('ChatScreen', {
            contactId,
            name: contactName,
            avatar: '../assets/icon.png',
        });
    };

    const handleChatClickGroup = async (groupId, groupName, members) => {
        const currentUserId = auth.currentUser?.uid;
        const chatId = groupId + "__";

        const db = getDatabase();
        const chatRef = ref(db, `chats/${chatId}`);

        try {
            const snapshot = await get(chatRef);
            if (!snapshot.exists()) {
                const newChat = {
                    users: members,
                    messages: [],
                };
                await set(chatRef, newChat);
            }
        } catch (e) {
            console.error("Error creating group chat:", e.message);
        }

        navigation.navigate('ChatScreenGroup', {
            groupId,
            name: groupName,
            avatar: '../assets/icon.png',
        });
    };

    const onChangeSearch = (query) => setSearchQuery(query);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#6200ee"/>
                <Text>Loading contacts...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search contacts or groups"
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />

            <TouchableOpacity
                style={styles.optionButton}
                onPress={() => navigation.navigate('CreateGroupScreen')}
            >
                <MaterialIcons name="group" size={24} color="white" style={styles.icon}/>
                <Text style={styles.optionText}>New Group</Text>
            </TouchableOpacity>

            {filteredGroups.length > 0 && (
                <>
                    <Text style={styles.sectionHeader}>Groups</Text>
                    <FlatList
                        data={filteredGroups}
                        renderItem={({item}) => (
                            <TouchableOpacity onPress={() => handleChatClickGroup(item.id, item.name, item.members)}>
                                <View style={styles.contactItem}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>{item.name[0]}</Text>
                                    </View>
                                    <View style={styles.contactDetails}>
                                        <Text style={styles.contactName}>{item.name}</Text>
                                        <Text style={styles.contactEmail}>Group</Text>
                                    </View>
                                    {item.online ? <View style={styles.onlineIndicator}/> :
                                        <View style={styles.oflineIndicator}/>}
                                </View>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => `group_${item.id}`}
                        ListEmptyComponent={
                            <Text style={styles.emptyListText}>No groups found</Text>
                        }
                    />
                </>
            )}

            {filteredContacts.length > 0 && (
                <>
                    <Text style={styles.sectionHeader}>Contacts</Text>
                    <FlatList
                        data={filteredContacts}
                        renderItem={({item}) => (
                            <TouchableOpacity onPress={() => handleChatClick(item.id, item.pseudo)}>
                                <View style={styles.contactItem}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>{item.pseudo[0]}</Text>
                                    </View>
                                    <View style={styles.contactDetails}>
                                        <Text style={styles.contactName}>{item.pseudo}</Text>
                                        <Text style={styles.contactEmail}>{item.email}</Text>
                                    </View>
                                    {item.online ? <View style={styles.onlineIndicator}/> :
                                        <View style={styles.oflineIndicator}/>}
                                </View>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => `contact_${item.id}`}
                        ListEmptyComponent={
                            <Text style={styles.emptyListText}>No contacts found</Text>
                        }
                    />
                </>
            )}
            {filteredGroups.length === 0 && filteredContacts.length === 0 && (
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No results found</Text>
                </View>
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20,
        paddingHorizontal: 15,
    },
    listContact: {
        marginTop: 10,
        paddingTop: 0,
    },
    searchBar: {

        marginBottom: 20,
        borderRadius: 10,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6200ee',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    icon: {
        marginRight: 10,
    },
    optionText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6200ee',
        marginTop: 20,
        marginBottom: 10,
    },
    sectionHeader1: {
        marginTop: 0,

        fontSize: 18,
        fontWeight: 'bold',
        color: '#6200ee',
        marginBottom: 10,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200ee',
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    contactEmail: {
        fontSize: 14,
        color: '#777',
    },
    onlineIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4caf50',
    },
    oflineIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(168,182,169,0.24)',
    },
    emptyListText: {
        textAlign: 'center',
        color: '#777',
        padding: 20,
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noResultsText: {
        fontSize: 18,
        color: '#777',
    },
});
