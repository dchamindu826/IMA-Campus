import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Modal, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import io from 'socket.io-client';
import api from '../services/api';
import COLORS from '../constants/colors';

const DP_IMAGES = Array.from({ length: 20 }, (_, i) => `${(i + 1).toString().padStart(2, '0')}.jpg`);

const CommunityChatScreen = ({ route, navigation }) => {
    const { businessId, businessName } = route.params || {};
    const { userInfo, userToken } = useContext(AuthContext);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLocked, setIsLocked] = useState(false);

    // Profile State
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [tempUsername, setTempUsername] = useState("");
    const [selectedDp, setSelectedDp] = useState(DP_IMAGES[0]);
    const [chatProfile, setChatProfile] = useState(null);

    const socketRef = useRef(null);
    const flatListRef = useRef(null);

    const userRole = String(userInfo?.role || 'Student').toUpperCase();
    const isStaff = userRole !== 'STUDENT' && userRole !== 'USER';

    useEffect(() => {
        if (!isStaff) {
            checkProfile();
        } else {
            initChat();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const checkProfile = async () => {
        try {
            const res = await api.get('mobile/chat/profile');
            if (res.data.profile.appChatUsername) {
                setChatProfile({ username: res.data.profile.appChatUsername, dp: res.data.profile.appChatDp });
                initChat();
            } else {
                setShowProfileSetup(true);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const saveProfile = async () => {
        if (!tempUsername.trim()) {
            Alert.alert("Error", "Please enter a username");
            return;
        }
        try {
            const res = await api.post('mobile/chat/profile', { username: tempUsername, dp: selectedDp });
            if (res.data.success) {
                setChatProfile({ username: res.data.profile.appChatUsername, dp: res.data.profile.appChatDp });
                setShowProfileSetup(false);
                initChat();
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.error || "Failed to update profile");
        }
    };

    const initChat = async () => {
        if (!businessId) return;
        try {
            // Load History
            const res = await api.get(`mobile/chat/history/${businessId}`);
            if (res.data.success) {
                setMessages(res.data.messages);
                setIsLocked(res.data.isLocked);
            }

            // Connect Socket
            // Determine backend URL from api defaults
            const backendUrl = api.defaults.baseURL.replace('/api', '');

            socketRef.current = io(backendUrl, {
                auth: { token: userToken }
            });

            socketRef.current.emit("join_business_chat", { businessId });

            socketRef.current.on("new_message", (msg) => {
                setMessages(prev => [msg, ...prev]);
            });

            socketRef.current.on("message_deleted", ({ messageId }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true } : m));
            });

            socketRef.current.on("message_pinned", ({ messageId, isPinned }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPinned: isPinned } : m));
            });

            socketRef.current.on("chat_locked_toggled", ({ isLocked }) => {
                setIsLocked(isLocked);
            });

            socketRef.current.on("error", (err) => {
                Alert.alert("Notice", err.message);
            });

        } catch (e) {
            console.log("Init Chat Error", e);
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit("send_message", { businessId, message: newMessage });
        setNewMessage("");
    };

    const deleteMessage = (msgId) => {
        if (!isStaff) return;
        Alert.alert("Delete Message", "Are you sure?", [
            { text: "Cancel" },
            { text: "Delete", onPress: () => socketRef.current.emit("delete_message", { messageId: msgId, businessId }) }
        ]);
    };

    const toggleLock = () => {
        if (!isStaff) return;
        socketRef.current.emit("toggle_lock", { businessId, isLocked: !isLocked });
    };

    const renderMessage = ({ item }) => {
        const isMine = item.senderId === userInfo.id;

        if (item.isDeleted) {
            return (
                <View style={[styles.messageWrapper, isMine ? styles.messageMine : styles.messageOther]}>
                    <View style={[styles.messageBubble, { backgroundColor: '#f0f0f0' }]}>
                        <Text style={{ color: '#888', fontStyle: 'italic' }}>
                            {item.deletedByAI ? "🛡️ Message removed by AI Moderation Agent" : "🗑️ Message deleted by Admin"}
                        </Text>
                    </View>
                </View>
            );
        }

        const dpUrl = item.sender?.appChatDp ? `${api.defaults.baseURL.replace('/api', '')}/storage/images/chat_dps/${item.sender.appChatDp}` : null;

        return (
            <TouchableOpacity
                onLongPress={() => deleteMessage(item.id)}
                delayLongPress={500}
                style={[styles.messageWrapper, isMine ? styles.messageMine : styles.messageOther]}
            >
                {!isMine && (
                    <Image
                        source={dpUrl ? { uri: dpUrl } : require('../../assets/images/user-avatar.png')}
                        style={styles.avatar}
                        defaultSource={require('../../assets/images/user-avatar.png')}
                    />
                )}
                <View>
                    {!isMine && (
                        <Text style={styles.senderName}>
                            {item.sender?.role !== 'Student' ? (item.sender?.firstName + ' 👑') : item.sender?.appChatUsername}
                        </Text>
                    )}
                    <View style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                        <Text style={isMine ? styles.textMine : styles.textOther}>{item.message}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (showProfileSetup) {
        return (
            <View style={styles.profileContainer}>
                <LinearGradient colors={[COLORS.primary, '#9B1B1B']} style={StyleSheet.absoluteFill} />
                <View style={styles.profileCard}>
                    <Text style={styles.profileTitle}>Setup Your Chat Profile</Text>
                    <Text style={styles.profileSubtitle}>Choose a username and an avatar</Text>

                    <Image
                        source={{ uri: `${api.defaults.baseURL.replace('/api', '')}/storage/images/chat_dps/${selectedDp}` }}
                        style={styles.largeAvatar}
                    />

                    <FlatList
                        horizontal
                        data={DP_IMAGES}
                        keyExtractor={(item) => item}
                        showsHorizontalScrollIndicator={false}
                        style={{ maxHeight: 70, marginBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => setSelectedDp(item)}>
                                <Image
                                    source={{ uri: `${api.defaults.baseURL.replace('/api', '')}/storage/images/chat_dps/${item}` }}
                                    style={[styles.smallAvatar, selectedDp === item && styles.selectedAvatar]}
                                />
                            </TouchableOpacity>
                        )}
                    />

                    <TextInput
                        style={styles.inputField}
                        placeholder="Choose a cool username"
                        value={tempUsername}
                        onChangeText={setTempUsername}
                        maxLength={20}
                    />

                    <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                        <Text style={styles.saveButtonText}>Join Chat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <LinearGradient colors={[COLORS.primary, '#9B1B1B']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
                    <Icon name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{businessName || 'Community Chat'}</Text>
                {isStaff && (
                    <TouchableOpacity onPress={toggleLock} style={{ padding: 10 }}>
                        <Icon name={isLocked ? "lock" : "lock-open-variant"} size={24} color="white" />
                    </TouchableOpacity>
                )}
            </LinearGradient>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={{ padding: 15 }}
            />

            {(isLocked && !isStaff) ? (
                <View style={styles.lockedBar}>
                    <Icon name="lock" size={20} color="#888" />
                    <Text style={{ color: '#888', marginLeft: 10 }}>Chat is locked by an admin</Text>
                </View>
            ) : (
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.messageInput}
                        placeholder="Type your message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <Icon name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 10 },
    headerTitle: { flex: 1, color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    messageWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end', maxWidth: '80%' },
    messageMine: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    messageOther: { alignSelf: 'flex-start' },
    avatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
    senderName: { fontSize: 12, color: '#888', marginBottom: 2, marginLeft: 2 },
    messageBubble: { padding: 12, borderRadius: 20 },
    bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 5 },
    bubbleOther: { backgroundColor: 'white', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#E0E0E0' },
    textMine: { color: 'white', fontSize: 15 },
    textOther: { color: '#333', fontSize: 15 },
    inputArea: { flexDirection: 'row', padding: 10, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderColor: '#EEE' },
    messageInput: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
    sendButton: { backgroundColor: COLORS.primary, width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    lockedBar: { padding: 15, backgroundColor: '#E0E0E0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },

    // Profile Setup Styles
    profileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    profileCard: { backgroundColor: 'white', width: '100%', padding: 25, borderRadius: 20, alignItems: 'center', elevation: 10 },
    profileTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    profileSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    largeAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 3, borderColor: COLORS.primary },
    smallAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
    selectedAvatar: { borderColor: COLORS.primary },
    inputField: { width: '100%', backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#DDD' },
    saveButton: { width: '100%', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default CommunityChatScreen;
