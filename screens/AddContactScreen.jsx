import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {getDatabase, ref, get, child, update} from "firebase/database";
import {auth} from "../firebaseConfig";

export default function AddContactScreen({navigation}) {
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    const handleAddContact = async () => {
        const db = getDatabase();
        const currentUserId = auth.currentUser?.uid;

        if (!currentUserId) {
            alert("User not logged in!");
            return;
        }

        try {
            const usersRef = ref(db, "users");
            const usersSnapshot = await get(usersRef); // Get all users
            const allUsers = usersSnapshot.val();

            let userToAddId = null;
            let currentUserName = null

            // Look for user with matching email
            for (const userId in allUsers) {
                if (userId === currentUserId) {
                    currentUserName = allUsers[userId]?.name
                }
                if (allUsers[userId]?.email === contactEmail.trim()) {
                    userToAddId = userId;
                }
            }

            if (!userToAddId) {
                alert("User with this email does not exist.");
                return;
            }

            // Add the contact with the provided pseudo
            const contactListRef = ref(db, `users/${currentUserId}/contactList/${userToAddId}`);
            const contactToAddListRef = ref(db, `users/${userToAddId}/contactList/${currentUserId}`);

            await update(contactListRef, {pseudo: contactName});
            await update(contactToAddListRef, {pseudo: currentUserName});

            alert("Contact successfully added!");
            navigation.goBack(); // Navigate back
        } catch (error) {
            console.error("Error adding contact:", error);
            alert("Failed to add contact. Try again!");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add New Contact</Text>
            <TextInput
                style={styles.input}
                placeholder="Contact Name"
                value={contactName}
                onChangeText={setContactName}
            />
            <TextInput
                style={styles.input}
                placeholder="Contact Email"
                value={contactEmail}
                onChangeText={setContactEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleAddContact}>
                <Text style={styles.buttonText}>Add Contact</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        width: '80%',
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 15,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
