import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import {getDatabase, ref, onValue,push,set} from "firebase/database";
import { auth } from "../firebaseConfig";

export default function CreateGroupScreen({ navigation }) {
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupName, setGroupName] = useState('');

    useEffect(() => {
        const db = getDatabase();
        const currentUserId = auth.currentUser?.uid;

        if (!currentUserId) {
            alert("User not logged in!");
            return;
        }
        const contactListeners = new Map();


        // Fetch contacts with more detailed information
        const contactListRef = ref(db, `users/${currentUserId}/contactList`);
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








        return () => {
            unsubscribeContacts()
            contactListeners.forEach((unsubscribe) => unsubscribe());
            contactListeners.clear();
        };
    }, []);

    const handleToggleContact = (contactId) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter((id) => id !== contactId)
                : [...prev, contactId]
        );
    };

    // Enhanced search to check both pseudo and email
    const filteredContacts = contacts.filter((contact) => {
        const lowercaseQuery = searchQuery?.toLowerCase();
        return (
            contact.pseudo?.toLowerCase().includes(lowercaseQuery) ||
            (contact.email && contact.email?.toLowerCase().includes(lowercaseQuery))
        );
    });

    const handleCreateGroup = () => {
        console.log("hello fropm create group ")
        if (!groupName.trim()) {
            alert("Group name is required!");
            return;
        }

        if (selectedContacts.length === 0) {
            alert("Select at least one contact to create a group!");
            return;
        }
        if(filteredContacts.length===0){
            return;
        }

        const db = getDatabase();
        const groupRef = ref(db, 'groups');
        const newGroupRef = push(groupRef);
        const currentUserId = auth.currentUser?.uid;

        const newGroup = {
            id: newGroupRef.key,
            name: groupName,
            members: [...selectedContacts, currentUserId],
            createdBy: currentUserId,
            createdAt: new Date().toISOString(),
        };

        set(newGroupRef, newGroup)
            .then(() => {
                alert("Group created successfully!");
                navigation.goBack();
            })
            .catch((error) => {
                console.error(error.message);
                alert("Failed to create group!");
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Group</Text>

            <Searchbar
                placeholder="Search Contacts (Name or Email)"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />

            <TextInput
                placeholder="Enter Group Name"
                value={groupName}
                onChangeText={setGroupName}
                style={styles.input}
                maxLength={50}
            />

            {filteredContacts.length === 0 && (
                <Text style={styles.noResultsText}>No contacts found</Text>
            )}

            <FlatList
                data={filteredContacts}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.contactItem,
                            selectedContacts.includes(item.id) && styles.selectedContact,
                        ]}
                        onPress={() => handleToggleContact(item.id)}
                    >
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{item.pseudo[0]}</Text>
                        </View>
                        <View style={styles.contactDetails}>
                            <Text style={styles.contactName}>{item.pseudo}</Text>
                            <Text style={styles.contactEmail}>{item.email}</Text>
                        </View>
                        {selectedContacts.includes(item.id) && (
                            <MaterialIcons name="check" size={20} color="#4caf50" />
                        )}
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
            />

            <TouchableOpacity
                style={[
                    styles.createButton,
                    (filteredContacts.length !== 0)
                        ? {}
                        : styles.createButtonDisabled
                ]}
                onPress={handleCreateGroup}
                disabled={filteredContacts.length === 0}
            >
                <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
            <Text>{filteredContacts.length}</Text>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200ee',
        marginBottom: 20,
    },
    searchBar: {
        marginBottom: 20,
        borderRadius: 10,
    },
    input: {
        backgroundColor: '#f6f6f6',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 20,
        fontSize: 16,
        color: '#333',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedContact: {
        backgroundColor: 'rgba(98, 0, 238, 0.1)',
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
    contactName: {
        fontSize: 16,
        color: '#333',
    },
    createButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 20,
    },
    createButtonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    contactDetails: {
        flex: 1,
        marginLeft: 10,
    },
    contactEmail: {
        fontSize: 12,
        color: '#777',
    },
    createButtonDisabled: {
        backgroundColor: '#a0a0a0',
    },
    noResultsText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 20,
        fontSize: 16,
    },
});