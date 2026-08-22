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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    loadUserData();
    loadSavedItems();
    fetchContent();
  }, [contentType, activeTab, selectedCategory]);

  const loadUserData = async () => {
    try {
      const user = await AsyncStorage.getItem('@logged_in_user');
      if (user) setCurrentUser(JSON.parse(user));
    } catch (e) {
      console.log(e);
    }
  };

  const loadSavedItems = async () => {
    try {
      const saved = await AsyncStorage.getItem('@saved_items');
      if (saved) setSavedItems(JSON.parse(saved));
    } catch (e) {
      console.log(e);
    }
  };

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

  const toggleSave = async (item) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to save movies to your watchlist.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => setAuthModalVisible(true) }
      ]);
      return;
    }
    const exists = savedItems.some((i) => i.id === item.id);
    let updated;
    if (exists) {
      updated = savedItems.filter((i) => i.id !== item.id);
    } else {
      updated = [...savedItems, item];
    }
    setSavedItems(updated);
    await AsyncStorage.setItem('@saved_items', JSON.stringify(updated));
  };

  const handleAuth = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (isSignUp && !usernameInput.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    if (isSignUp) {
      const newUser = { username: usernameInput, email: emailInput, password: passwordInput };
      await AsyncStorage.setItem(`@user_${emailInput}`, JSON.stringify(newUser));
      await AsyncStorage.setItem('@logged_in_user', JSON.stringify(newUser));
      setCurrentUser(newUser);
      Alert.alert('Welcome!', `Account created successfully, ${newUser.username}!`);
    } else {
      const stored = await AsyncStorage.getItem(`@user_${emailInput}`);
      if (!stored) {
        Alert.alert('Error', 'No account found with this email. Please Sign Up.');
        return;
      }
      const user = JSON.parse(stored);
      if (user.password !== passwordInput) {
        Alert.alert('Error', 'Incorrect password!');
        return;
      }
      await AsyncStorage.setItem('@logged_in_user', JSON.stringify(user));
      setCurrentUser(user);
      Alert.alert('Success', `Welcome back, ${user.username}!`);
    }

    setUsernameInput('');
    setEmailInput('');
    setPasswordInput('');
    setAuthModalVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('@logged_in_user');
          setCurrentUser(null);
        }
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

        {/* User Profile / Login Button */}
        {currentUser ? (
          <TouchableOpacity style={styles.userProfileBtn} onPress={handleLogout}>
            <Ionicons name="person-circle" size={32} color="#e50914" />
            <Text style={styles.usernameText} numberOfLines={1}>
              {currentUser.username}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtnHeader} onPress={() => setAuthModalVisible(true)}>
            <Ionicons name="log-in-outline" size={18} color="#fff" />
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

      {/* Search Input */}
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

      {/* Main List */}
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

      {/* Movie Details Modal */}
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
  closeBtnText: { color: '#fff', f
export default function App() {
  const [mediaType, setMediaType] = useState('movie');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('popular');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cast, setCast] = useState([]);
  const [providers, setProviders] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const genres = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;

  const toggleSaveItem = (item) => {
    const exists = savedItems.some((m) => m.id === item.id);
    if (exists) {
      setSavedItems(savedItems.filter((m) => m.id !== item.id));
    } else {
      setSavedItems([{ ...item, media_type_saved: mediaType }, ...savedItems]);
    }
  };

  const fetchMedia = async () => {
    if (tab === 'saved') {
      setItems(savedItems);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = '';
      const endpointType = mediaType === 'movie' ? 'movie' : 'tv';
      const actualTab = tab === 'upcoming' && mediaType === 'tv' ? 'on_the_air' : tab;

      if (searchQuery.trim().length > 0) {
        url = `${BASE_URL}/search/${endpointType}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}`;
      } else if (selectedGenre !== 'all') {
        url = `${BASE_URL}/discover/${endpointType}?api_key=${API_KEY}&with_genres=${selectedGenre}`;
      } else {
        url = `${BASE_URL}/${endpointType}/${actualTab}?api_key=${API_KEY}&language=en-US&page=1`;
      }

      const res = await fetch(url);
      const json = await res.json();
      setItems(json.results || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [mediaType, tab, selectedGenre, searchQuery, savedItems]);

  const openDetails = async (item) => {
    const type = item.media_type_saved || mediaType;
    setSelectedItem({ ...item, currentType: type });
    setModalVisible(true);
    setDetailLoading(true);

    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const credRes = await fetch(`${BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`);
      const credJson = await credRes.json();
      setCast(credJson.cast ? credJson.cast.slice(0, 10) : []);

      const vidRes = await fetch(`${BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`);
      const vidJson = await vidRes.json();
      const officialTrailer = vidJson.results ? vidJson.results.find((v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube') : null;
      setTrailerKey(officialTrailer ? officialTrailer.key : null);

      const provRes = await fetch(`${BASE_URL}/${endpoint}/${item.id}/watch/providers?api_key=${API_KEY}`);
      const provJson = await provRes.json();
      const regionData = provJson.results ? (provJson.results.IN || provJson.results.US) : null;
      setProviders(regionData ? (regionData.flatrate || regionData.buy || []) : []);

      const simRes = await fetch(`${BASE_URL}/${endpoint}/${item.id}/similar?api_key=${API_KEY}`);
      const simJson = await simRes.json();
      setSimilar(simJson.results ? simJson.results.slice(0, 8) : []);
    } catch (e) {
      console.log('Error loading details:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const isSaved = (id) => savedItems.some((m) => m.id === id);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="film" size={18} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>MOVIE COLLECTION</Text>
          <Text style={styles.headerSubtitle}>Movies & TV Series Vault</Text>
        </View>
      </View>

      <View style={styles.typeSwitcher}>
        <TouchableOpacity
          style={[styles.typeBtn, mediaType === 'movie' && styles.typeBtnActive]}
          onPress={() => { setMediaType('movie'); setSelectedGenre('all'); setSearchQuery(''); }}
        >
          <Ionicons name="film" size={14} color={mediaType === 'movie' ? '#fff' : '#888'} />
          <Text style={[styles.typeBtnText, mediaType === 'movie' && styles.typeBtnTextActive]}>Movies</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeBtn, mediaType === 'tv' && styles.typeBtnActive]}
          onPress={() => { setMediaType('tv'); setSelectedGenre('all'); setSearchQuery(''); }}
        >
          <Ionicons name="tv" size={14} color={mediaType === 'tv' ? '#fff' : '#888'} />
          <Text style={[styles.typeBtnText, mediaType === 'tv' && styles.typeBtnTextActive]}>TV Series</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {['popular', 'upcoming', 'top_rated', 'saved'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabButton, tab === t && styles.tabButtonActive]}
            onPress={() => { setTab(t); setSearchQuery(''); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'popular' ? 'Popular' : t === 'upcoming' ? (mediaType === 'movie' ? 'Upcoming' : 'On Air') : t === 'top_rated' ? 'Top Rated' : `Saved (${savedItems.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab !== 'saved' && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#888" style={{ marginRight: 6 }} />
          <TextInput
            placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'series'}...`}
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(txt) => setSearchQuery(txt)}
          />
        </View>
      )}

      {tab !== 'saved' && !searchQuery && (
        <View style={{ height: 38, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreList}>
            {genres.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genrePill, selectedGenre === g.id && styles.genrePillActive]}
                onPress={() => setSelectedGenre(g.id)}
              >
                <Text style={[styles.genreText, selectedGenre === g.id && styles.genreTextActive]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyView}>
          <Ionicons name="film-outline" size={50} color="#444" />
          <Text style={styles.emptyText}>No titles found.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.movieList}
          renderItem={({ item }) => {
            const title = item.title || item.name;
            const date = item.release_date || item.first_air_date || 'N/A';
            const isSeries = !!item.first_air_date || mediaType === 'tv';

            return (
              <TouchableOpacity style={styles.movieCard} activeOpacity={0.8} onPress={() => openDetails(item)}>
                <Image
                  source={{ uri: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450/1c1c1e/ffffff?text=No+Poster' }}
                  style={styles.poster}
                />
                <View style={styles.movieInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: isSeries ? '#38006b' : '#7f0000' }]}>
                    <Text style={styles.typeBadgeText}>{isSeries ? 'SERIES' : 'MOVIE'}</Text>
                  </View>
                  <Text style={styles.movieTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.releaseDate}>📅 {date}</Text>
                  <Text style={styles.rating}>⭐ {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}/10</Text>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => openDetails(item)}>
                    <Ionicons name="play" size={10} color="#fff" />
                    <Text style={styles.detailBtnText}> Details</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.saveIcon} onPress={() => toggleSaveItem(item)}>
                  <Ionicons name={isSaved(item.id) ? 'heart' : 'heart-outline'} size={22} color={isSaved(item.id) ? '#E50914' : '#fff'} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <ScrollView>
            <View style={styles.backdropBox}>
              <Image
                source={{ uri: selectedItem && selectedItem.backdrop_path ? `${BACKDROP_BASE}${selectedItem.backdrop_path}` : selectedItem && selectedItem.poster_path ? `${IMAGE_BASE}${selectedItem.poster_path}` : 'https://via.placeholder.com/500x280' }}
                style={styles.backdropImage}
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>{selectedItem ? selectedItem.title || selectedItem.name : ''}</Text>
                <TouchableOpacity onPress={() => selectedItem && toggleSaveItem(selectedItem)}>
                  <Ionicons name={selectedItem && isSaved(selectedItem.id) ? 'heart' : 'heart-outline'} size={26} color={selectedItem && isSaved(selectedItem.id) ? '#E50914' : '#fff'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                ⭐ {selectedItem && selectedItem.vote_average ? selectedItem.vote_average.toFixed(1) : 'N/A'}/10 | 📅 {selectedItem ? selectedItem.release_date || selectedItem.first_air_date : ''}
              </Text>

              {trailerKey ? (
                <TouchableOpacity style={styles.trailerBtn} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`)}>
                  <Ionicons name="logo-youtube" size={18} color="#fff" />
                  <Text style={styles.trailerBtnText}> Watch Official Trailer</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.sectionHeader}>Overview</Text>
              <Text style={styles.overviewText}>{selectedItem && selectedItem.overview ? selectedItem.overview : 'No description available.'}</Text>

              {detailLoading ? (
                <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 20 }} />
              ) : (
                <>
                  {providers.length > 0 ? (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionHeader}>Where to Watch (OTT)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {providers.map((p, idx) => (
                          <View key={idx} style={{ alignItems: 'center', marginRight: 10, width: 50 }}>
                            <Image source={{ uri: `https://image.tmdb.org/t/p/w200${p.logo_path}` }} style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 2 }} />
                            <Text style={{ color: '#888', fontSize: 8, textAlign: 'center' }} numberOfLines={1}>{p.provider_name}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {cast.length > 0 ? (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionHeader}>Top Cast</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {cast.map((c) => (
                          <View key={c.id} style={{ width: 70, marginRight: 8, alignItems: 'center' }}>
                            <Image source={{ uri: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://via.placeholder.com/100x150/2c2c2e/ffffff?text=Actor' }} style={{ width: 60, height: 80, borderRadius: 6, marginBottom: 2 }} />
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{c.name}</Text>
                            <Text style={{ color: '#777', fontSize: 8, textAlign: 'center' }} numberOfLines={1}>{c.character}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {similar.length > 0 ? (
                    <View style={{ marginTop: 16, marginBottom: 25 }}>
                      <Text style={styles.sectionHeader}>More Like This</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {similar.map((sim) => (
                          <TouchableOpacity key={sim.id} style={{ width: 75, marginRight: 8 }} onPress={() => openDetails(sim)}>
                            <Image source={{ uri: sim.poster_path ? `${IMAGE_BASE}${sim.poster_path}` : 'https://via.placeholder.com/100x150' }} style={{ width: 75, height: 110, borderRadius: 6, marginBottom: 2 }} />
                            <Text style={{ color: '#aaa', fontSize: 9, textAlign: 'center' }} numberOfLines={1}>{sim.title || sim.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  logoBadge: { backgroundColor: '#E50914', padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  headerSubtitle: { fontSize: 9, color: '#888888', fontWeight: '600' },
  typeSwitcher: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 6, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 2 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 6, gap: 4 },
  typeBtnActive: { backgroundColor: '#E50914' },
  typeBtnText: { color: '#888', fontWeight: '700', fontSize: 12 },
  typeBtnTextActive: { color: '#fff' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6, justifyContent: 'space-between' },
  tabButton: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#1E1E1E' },
  tabButtonActive: { backgroundColor: '#333' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', marginHorizontal: 16, borderRadius: 6, paddingHorizontal: 10, height: 36, marginBottom: 6 },
  searchInput: { flex: 1, color: '#fff', fontSize: 12 },
  genreList: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  genrePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#222' },
  genrePillActive: { backgroundColor: '#E50914' },
  genreText: { color: '#999', fontSize: 11, fontWeight: '600' },
  genreTextActive: { color: '#fff' },
  movieList: { paddingHorizontal: 16, paddingBottom: 15 },
  movieCard: { flexDirection: 'row', backgroundColor: '#1c1c1e', borderRadius: 10, marginBottom: 10, overflow: 'hidden', position: 'relative' },
  poster: { width: 85, height: 125, borderRadius: 6 },
  movieInfo: { flex: 1, padding: 8, justifyContent: 'center' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginBottom: 2 },
  typeBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  movieTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  releaseDate: { color: '#888', fontSize: 10, marginBottom: 2 },
  rating: { color: '#FFD700', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  detailBtn: { alignSelf: 'flex-start', backgroundColor: '#2a2a2c', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  detailBtnText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  saveIcon: { position: 'absolute', top: 8, right: 8, padding: 2 },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#888', fontSize: 14, marginTop: 8 },
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  backdropBox: { width: '100%', height: 200, position: 'relative' },
  backdropImage: { width: '100%', height: '100%' },
  closeBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 4 },
  modalBody: { padding: 14 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', flex: 1, marginRight: 8 },
  modalSubtitle: { color: '#999', fontSize: 12, marginTop: 2, marginBottom: 10 },
  trailerBtn: { backgroundColor: '#E50914', paddingVertical: 8, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  trailerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sectionHeader: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  overviewText: { color: '#bbb', fontSize: 12, lineHeight: 16 }
});
