import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TMDB_API_KEY = '2dca580c2a14b55200e784d157207b4d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '878', name: 'Sci-Fi' },
];

export default function App() {
  const [contentType, setContentType] = useState('movie');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('popular');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [savedItems, setSavedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Auth States
  const [currentUser, setCurrentUser] = useState(null);
  const [usersDb, setUsersDb] = useState([]);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    fetchContent();
  }, [contentType, activeTab, selectedCategory]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (searchQuery.trim()) {
        endpoint = `${BASE_URL}/search/${contentType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`;
      } else if (selectedCategory !== 'all') {
        endpoint = `${BASE_URL}/discover/${contentType}?api_key=${TMDB_API_KEY}&with_genres=${selectedCategory}&sort_by=popularity.desc`;
      } else {
        const path = activeTab === 'upcoming' ? (contentType === 'movie' ? 'upcoming' : 'on_the_air') : activeTab;
        endpoint = `${BASE_URL}/${contentType}/${path}?api_key=${TMDB_API_KEY}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      setItems(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = (item) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to save movies to your watchlist.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => setAuthModalVisible(true) }
      ]);
      return;
    }
    const exists = savedItems.some((i) => i.id === item.id);
    if (exists) {
      setSavedItems(savedItems.filter((i) => i.id !== item.id));
    } else {
      setSavedItems([...savedItems, item]);
    }
  };

  const handleAuth = () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (isSignUp) {
      if (!usernameInput.trim()) {
        Alert.alert('Error', 'Please enter your username');
        return;
      }
      const existingUser = usersDb.find((u) => u.email.toLowerCase() === emailInput.toLowerCase());
      if (existingUser) {
        Alert.alert('Error', 'Account already exists with this email.');
        return;
      }
      const newUser = { username: usernameInput, email: emailInput, password: passwordInput };
      setUsersDb([...usersDb, newUser]);
      setCurrentUser(newUser);
      Alert.alert('Welcome!', `Account created successfully, ${newUser.username}!`);
    } else {
      const user = usersDb.find(
        (u) => u.email.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput
      );
      if (!user) {
        Alert.alert('Error', 'Invalid email or password. If new, please switch to Sign Up.');
        return;
      }
      setCurrentUser(user);
      Alert.alert('Success', `Welcome back, ${user.username}!`);
    }

    setUsernameInput('');
    setEmailInput('');
    setPasswordInput('');
    setAuthModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => setCurrentUser(null)
      }
    ]);
  };

  const renderCard = ({ item }) => {
    const isSaved = savedItems.some((i) => i.id === item.id);
    return (
      <View style={styles.card}>
        <Image
          source={{
            uri: item.poster_path
              ? `${IMAGE_URL}${item.poster_path}`
              : 'https://via.placeholder.com/300x450?text=No+Poster',
          }}
          style={styles.cardImage}
        />
        <View style={styles.cardDetails}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {contentType === 'movie' ? 'MOVIE' : 'TV SERIES'}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <Text style={styles.cardDate}>
            📅 {item.release_date || item.first_air_date || 'N/A'}
          </Text>
          <Text style={styles.cardRating}>⭐ {item.vote_average?.toFixed(1)}/10</Text>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => {
              setSelectedItem(item);
              setModalVisible(true);
            }}
          >
            <Text style={styles.detailsBtnText}>▶ Details</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => toggleSave(item)}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={24}
            color={isSaved ? '#e50914' : '#fff'}
          />
        </TouchableOpacity>
      </View>
    );
  };
    return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="film" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>MOVIE COLLECTION</Text>
            <Text style={styles.headerSubtitle}>Movies & TV Series Vault</Text>
          </View>
        </View>

        {currentUser ? (
          <TouchableOpacity style={styles.userProfileBtn} onPress={handleLogout}>
            <Ionicons name="person-circle" size={30} color="#e50914" />
            <Text style={styles.usernameText} numberOfLines={1}>
              {currentUser.username}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtnHeader} onPress={() => setAuthModalVisible(true)}>
            <Ionicons name="log-in-outline" size={16} color="#fff" />
            <Text style={styles.loginBtnHeaderText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type Selector Tabs */}
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={[styles.switchBtn, contentType === 'movie' && styles.switchBtnActive]}
          onPress={() => {
            setContentType('movie');
            setActiveTab('popular');
          }}
        >
          <Ionicons name="film-outline" size={16} color={contentType === 'movie' ? '#fff' : '#888'} />
          <Text style={[styles.switchText, contentType === 'movie' && styles.switchTextActive]}>
            Movies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, contentType === 'tv' && styles.switchBtnActive]}
          onPress={() => {
            setContentType('tv');
            setActiveTab('popular');
          }}
        >
          <Ionicons name="tv-outline" size={16} color={contentType === 'tv' ? '#fff' : '#888'} />
          <Text style={[styles.switchText, contentType === 'tv' && styles.switchTextActive]}>
            TV Series
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabsContainer}>
        {['popular', 'upcoming', 'top_rated'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTabBtn, activeTab === tab && styles.subTabBtnActive]}
            onPress={() => {
              setActiveTab(tab);
              setSelectedCategory('all');
            }}
          >
            <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>
              {tab === 'popular' ? 'Popular' : tab === 'upcoming' ? 'Upcoming' : 'Top Rated'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.subTabBtn, activeTab === 'saved' && styles.subTabBtnActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.subTabText, activeTab === 'saved' && styles.subTabTextActive]}>
            Saved ({savedItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {activeTab !== 'saved' && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder={`Search ${contentType === 'movie' ? 'movies' : 'TV shows'}...`}
            placeholderTextColor="#777"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchContent}
          />
        </View>
      )}

      {/* Categories Bar */}
      {activeTab !== 'saved' && !searchQuery && (
        <View style={styles.categoryWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryBadge, selectedCategory === cat.id && styles.categoryBadgeActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content List */}
      <FlatList
        data={activeTab === 'saved' ? savedItems : items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchContent}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>
              {activeTab === 'saved' ? 'No saved items in your list yet.' : 'No movies found.'}
            </Text>
          </View>
        }
      />

      {/* Details Modal */}
      {selectedItem && (
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <ScrollView>
                <Image
                  source={{
                    uri: selectedItem.backdrop_path
                      ? `${IMAGE_URL}${selectedItem.backdrop_path}`
                      : `${IMAGE_URL}${selectedItem.poster_path}`,
                  }}
                  style={styles.modalImage}
                />
                <View style={{ padding: 15 }}>
                  <Text style={styles.modalTitle}>{selectedItem.title || selectedItem.name}</Text>
                  <Text style={styles.modalDetailsText}>
                    ⭐ {selectedItem.vote_average?.toFixed(1)}/10 | 📅 {selectedItem.release_date || selectedItem.first_air_date}
                  </Text>
                  <Text style={styles.modalOverview}>
                    {selectedItem.overview || 'No overview available for this title.'}
                  </Text>
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Auth Modal (Login / Sign Up) */}
      <Modal visible={authModalVisible} animationType="fade" transparent onRequestClose={() => setAuthModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.authBox}>
            <Text style={styles.authTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.authSubtitle}>
              {isSignUp ? 'Sign up to sync your watchlist' : 'Login to access your saved movies'}
            </Text>

            {isSignUp && (
              <TextInput
                style={styles.authInput}
                placeholder="Full Name / Username"
                placeholderTextColor="#777"
                value={usernameInput}
                onChangeText={setUsernameInput}
              />
            )}

            <TextInput
              style={styles.authInput}
              placeholder="Email Address"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={setEmailInput}
            />

            <TextInput
              style={styles.authInput}
              placeholder="Password"
              placeholderTextColor="#777"
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />

            <TouchableOpacity style={styles.authSubmitBtn} onPress={handleAuth}>
              <Text style={styles.authSubmitBtnText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.authToggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.authToggleText}>
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.authCancelBtn} onPress={() => setAuthModalVisible(false)}>
              <Text style={styles.authCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandBadge: { backgroundColor: '#e50914', padding: 8, borderRadius: 8, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSubtitle: { color: '#888', fontSize: 11 },
  userProfileBtn: { alignItems: 'center' },
  usernameText: { color: '#fff', fontSize: 10, maxWidth: 65, textAlign: 'center', marginTop: 2 },
  loginBtnHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e50914', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  loginBtnHeaderText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  switchContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', margin: 12, borderRadius: 10, padding: 3 },
  switchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  switchBtnActive: { backgroundColor: '#e50914' },
  switchText: { color: '#888', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  switchTextActive: { color: '#fff' },
  subTabsContainer: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  subTabBtn: { marginRight: 8, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#1e1e1e' },
  subTabBtnActive: { backgroundColor: '#333' },
  subTabText: { color: '#888', fontSize: 12 },
  subTabTextActive: { color: '#fff', fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', marginHorizontal: 12, marginBottom: 10, paddingHorizontal: 12, borderRadius: 8, height: 40 },
  input: { flex: 1, color: '#fff', fontSize: 13 },
  categoryWrapper: { marginBottom: 10 },
  categoryScroll: { paddingHorizontal: 12 },
  categoryBadge: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#1e1e1e', borderRadius: 15, marginRight: 6 },
  categoryBadgeActive: { backgroundColor: '#e50914' },
  categoryText: { color: '#888', fontSize: 12 },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#181818', borderRadius: 12, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  cardImage: { width: 95, height: 140 },
  cardDetails: { flex: 1, padding: 10, justifyContent: 'space-between' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#e50914', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  typeBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardDate: { color: '#888', fontSize: 11, marginVertical: 2 },
  cardRating: { color: '#ffb703', fontSize: 12, fontWeight: 'bold' },
  detailsBtn: { alignSelf: 'flex-start', backgroundColor: '#2a2a2a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  detailsBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  heartBtn: { position: 'absolute', top: 10, right: 10, padding: 5 },
  emptyView: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#666', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxHeight: '80%', backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden' },
  modalImage: { width: '100%', height: 200 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalDetailsText: { color: '#888', fontSize: 12, marginBottom: 10 },
  modalOverview: { color: '#ccc', fontSize: 13, lineHeight: 19 },
  closeBtn: { backgroundColor: '#e50914', padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' },
  authBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  authTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  authSubtitle: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 20, marginTop: 4 },
  authInput: { backgroundColor: '#262626', color: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, fontSize: 13 },
  authSubmitBtn: { backgroundColor: '#e50914', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  authSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  authToggleBtn: { marginTop: 14, alignItems: 'center' },
  authToggleText: { color: '#aaa', fontSize: 12 },
  authCancelBtn: { marginTop: 10, alignItems: 'center' },
  authCancelText: { color: '#666', fontSize: 12 }
});

