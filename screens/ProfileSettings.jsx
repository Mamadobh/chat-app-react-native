import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import {auth} from "../firebaseConfig";

export default function ProfileSettings({ navigation }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUserId}`);  // Replace 'yourUserId' with the actual user ID
        const unsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUsername(data.name || '');
                setEmail(data.email || '');
                setPhone(data.phone || '');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSaveSettings = () => {
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUserId}`);  // Replace 'yourUserId' with the actual user ID

        update(userRef, {
            name: username,
            email: email,
            phone: phone,
        })
            .then(() => {
                console.log('Profile updated successfully');
                navigation.goBack(); // Navigate back to the previous screen
            })
            .catch((error) => {
                console.error('Error updating profile:', error);
            });
    };

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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    input: {
        width: '80%',
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        fontSize: 16,
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
        fontWeight: 'bold',
    },
});
