import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SUPABASE_URL = 'https://zyqlntdpftowobsrzbgv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DuyB_EEKvMkDk0QFxQykqg_ZXCMzTwo';

const API_KEY = 'c45a857c193f6302f2b5061c3b85e743';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

const MOVIE_GENRES = [
  { id: 'all', name: 'All' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' }
];

const TV_GENRES = [
  { id: 'all', name: 'All' },
  { id: 10759, name: 'Action & Adv' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 9648, name: 'Mystery' },
  { id: 10765, name: 'Sci-Fi & Fantasy' }
];

export default function App() {
  const [mediaType, setMediaType] = useState('movie');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('popular');
  const [savedSubTab, setSavedSubTab] = useState('watchlist'); // 'watchlist' | 'watched'
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState([]);

  // Details Modal States
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cast, setCast] = useState([]);
  const [providers, setProviders] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Actor / Person Modal States
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorMovies, setActorMovies] = useState([]);
  const [actorModalVisible, setActorModalVisible] = useState(false);
  const [actorLoading, setActorLoading] = useState(false);

  // Cloud Account States
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('');
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);

  const genres = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const userStr = await AsyncStorage.getItem('@cloud_active_account');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        syncWatchlistFromCloud(user.email);
      }
    } catch (e) {
      console.log('Session error:', e);
    }
  };

  const syncWatchlistFromCloud = async (email) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users_vault?email=eq.${encodeURIComponent(email)}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0 && data[0].saved_movies) {
        setSavedItems(data[0].saved_movies);
      }
    } catch (e) {
      console.log('Cloud sync error:', e);
    }
  };

  const openActorDetails = async (person) => {
    setSelectedActor(person);
    setActorModalVisible(true);
    setActorLoading(true);
    try {
      const bioRes = await fetch(`${BASE_URL}/person/${person.id}?api_key=${API_KEY}&language=en-US`);
      const bioData = await bioRes.json();
      setSelectedActor(bioData);

      const creditsRes = await fetch(`${BASE_URL}/person/${person.id}/combined_credits?api_key=${API_KEY}&language=en-US`);
      const creditsData = await creditsRes.json();
      const sortedCredits = (creditsData.cast || [])
        .filter((m) => m.poster_path)
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

      setActorMovies(sortedCredits);
    } catch (err) {
      console.log('Actor fetch error:', err);
    } finally {
      setActorLoading(false);
    }
  };
  const handleCloudAuth = async () => {
    setAuthStatusMessage('');
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setIsSuccessMessage(false);
      setAuthStatusMessage('Please enter a valid Gmail address.');
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const cleanPass = passwordInput.trim();
        if (!cleanPass || cleanPass.length < 4) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Password must be at least 4 characters.');
          setAuthLoading(false);
          return;
        }

        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users_vault?email=eq.${encodeURIComponent(cleanEmail)}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const checkData = await checkRes.json();

        if (checkData && checkData.length > 0) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Account already exists! Please click Login.');
          setAuthLoading(false);
          return;
        }

        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users_vault`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass, saved_movies: [] })
        });

        if (insertRes.ok) {
          const userObj = { email: cleanEmail, name: cleanEmail.split('@')[0] };
          await AsyncStorage.setItem('@cloud_active_account', JSON.stringify(userObj));
          setCurrentUser(userObj);
          setSavedItems([]);
          setIsSuccessMessage(true);
          setAuthStatusMessage(`Account created! Welcome, ${userObj.name}`);

          setTimeout(() => {
            setAuthModalVisible(false);
            setEmailInput('');
            setPasswordInput('');
            setAuthStatusMessage('');
          }, 1000);
        } else {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Server error creating account.');
        }
      } else if (authMode === 'login') {
        const cleanPass = passwordInput.trim();
        if (!cleanPass) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Please enter your password.');
          setAuthLoading(false);
          return;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/users_vault?email=eq.${encodeURIComponent(cleanEmail)}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();

        if (!data || data.length === 0) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('No account found with this Gmail. Click Sign Up.');
          setAuthLoading(false);
          return;
        }

        if (data[0].password !== cleanPass) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Incorrect Password! If forgotten, click Forgot Password.');
          setAuthLoading(false);
          return;
        }

        const userObj = { email: cleanEmail, name: cleanEmail.split('@')[0] };
        await AsyncStorage.setItem('@cloud_active_account', JSON.stringify(userObj));
        setCurrentUser(userObj);
        setSavedItems(data[0].saved_movies || []);

        setIsSuccessMessage(true);
        setAuthStatusMessage(`Welcome back, ${userObj.name}! Watchlist restored.`);

        setTimeout(() => {
          setAuthModalVisible(false);
          setEmailInput('');
          setPasswordInput('');
          setAuthStatusMessage('');
        }, 1000);
      } else if (authMode === 'forgot') {
        const cleanNewPass = newPasswordInput.trim();
        if (!cleanNewPass || cleanNewPass.length < 4) {
          setIsSuccessMessage(false);
          setAuthStatusMessage('New password must be at least 4 characters.');
          setAuthLoading(false);
          return;
        }

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users_vault?email=eq.${encodeURIComponent(cleanEmail)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ password: cleanNewPass })
        });

        if (patchRes.ok) {
          const userObj = { email: cleanEmail, name: cleanEmail.split('@')[0] };
          await AsyncStorage.setItem('@cloud_active_account', JSON.stringify(userObj));
          setCurrentUser(userObj);
          syncWatchlistFromCloud(cleanEmail);

          setIsSuccessMessage(true);
          setAuthStatusMessage('Password updated! Logged in.');

          setTimeout(() => {
            setAuthModalVisible(false);
            setEmailInput('');
            setNewPasswordInput('');
            setAuthMode('login');
            setAuthStatusMessage('');
          }, 1000);
        } else {
          setIsSuccessMessage(false);
          setAuthStatusMessage('Could not reset password.');
        }
      }
    } catch (e) {
      setIsSuccessMessage(false);
      setAuthStatusMessage('Network error: ' + e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@cloud_active_account');
    setCurrentUser(null);
    setSavedItems([]);
    setProfileModalVisible(false);
  };

  // Toggle Item to 'watchlist' or 'watched'
  const toggleSaveItem = async (item, targetStatus = 'watchlist') => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthStatusMessage('Please login to save movies to Cloud.');
      setAuthModalVisible(true);
      return;
    }

    try {
      const existingIndex = savedItems.findIndex((m) => m.id === item.id);
      let updated = [...savedItems];

      if (existingIndex > -1) {
        if (updated[existingIndex].status === targetStatus) {
          updated.splice(existingIndex, 1); // Remove if clicked same button
        } else {
          updated[existingIndex].status = targetStatus; // Switch between watchlist and watched
        }
      } else {
        updated.unshift({ ...item, media_type_saved: mediaType, status: targetStatus });
      }

      setSavedItems(updated);

      await fetch(`${SUPABASE_URL}/rest/v1/users_vault?email=eq.${encodeURIComponent(currentUser.email)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ saved_movies: updated })
      });
    } catch (e) {
      console.log('Save error:', e);
    }
  };

  const getItemStatus = (id) => {
    const found = savedItems.find((m) => m.id === id);
    return found ? found.status : null;
  };

  const fetchMedia = async (pageNumber = 1, shouldReset = false) => {
    if (tab === 'saved') {
      const filtered = savedItems.filter((m) => (m.status || 'watchlist') === savedSubTab);
      setItems(filtered);
      setLoading(false);
      return;
    }

    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let url = '';
      const endpointType = mediaType === 'movie' ? 'movie' : 'tv';
      const actualTab = tab === 'upcoming' && mediaType === 'tv' ? 'on_the_air' : tab;

      if (searchQuery.trim().length > 0) {
        url = `${BASE_URL}/search/${endpointType}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${pageNumber}`;
      } else if (selectedGenre !== 'all') {
        url = `${BASE_URL}/discover/${endpointType}?api_key=${API_KEY}&with_genres=${selectedGenre}&page=${pageNumber}`;
      } else {
        url = `${BASE_URL}/${endpointType}/${actualTab}?api_key=${API_KEY}&language=en-US&page=${pageNumber}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      const results = json.results || [];
      setTotalPages(json.total_pages || 1);

      if (shouldReset || pageNumber === 1) {
        setItems(results);
      } else {
        setItems((prev) => [...prev, ...results]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchMedia(1, true);
  }, [mediaType, tab, savedSubTab, selectedGenre, savedItems]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages && tab !== 'saved') {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMedia(nextPage, false);
    }
  };

  const openDetails = async (item) => {
    const type = item.media_type_saved || item.media_type || mediaType;
    setSelectedItem({ ...item, currentType: type });
    setModalVisible(true);
    setDetailLoading(true);

    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const credRes = await fetch(`${BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`);
      const credJson = await credRes.json();
      setCast(credJson.cast ? credJson.cast.slice(0, 15) : []);

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
    const watchlistCount = savedItems.filter((m) => (m.status || 'watchlist') === 'watchlist').length;
  const watchedCount = savedItems.filter((m) => m.status === 'watched').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="film" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>MOVIE COLLECTION</Text>
            <Text style={styles.headerSubtitle}>Movies & TV Series Vault</Text>
          </View>
        </View>

        {currentUser ? (
          <TouchableOpacity style={styles.userProfileBtn} onPress={() => setProfileModalVisible(true)}>
            <Ionicons name="person-circle" size={28} color="#E50914" />
            <Text style={styles.usernameText} numberOfLines={1}>
              {currentUser.name}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtnHeader}
            onPress={() => {
              setAuthMode('login');
              setAuthStatusMessage('');
              setAuthModalVisible(true);
            }}
          >
            <Ionicons name="cloud-outline" size={15} color="#fff" />
            <Text style={styles.loginBtnHeaderText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type Switcher */}
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

      {/* Sub Tabs */}
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

      {/* Dual Sub-Tabs for Saved Section */}
      {tab === 'saved' && (
        <View style={styles.savedSubTabRow}>
          <TouchableOpacity
            style={[styles.savedSubTabBtn, savedSubTab === 'watchlist' && styles.savedSubTabBtnActive]}
            onPress={() => setSavedSubTab('watchlist')}
          >
            <Ionicons name="bookmark" size={14} color={savedSubTab === 'watchlist' ? '#fff' : '#888'} />
            <Text style={[styles.savedSubTabText, savedSubTab === 'watchlist' && styles.savedSubTabTextActive]}>
              Want to Watch ({watchlistCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.savedSubTabBtn, savedSubTab === 'watched' && styles.savedSubTabBtnActive]}
            onPress={() => setSavedSubTab('watched')}
          >
            <Ionicons name="checkmark-circle" size={14} color={savedSubTab === 'watched' ? '#fff' : '#888'} />
            <Text style={[styles.savedSubTabText, savedSubTab === 'watched' && styles.savedSubTabTextActive]}>
              Watched ({watchedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      {tab !== 'saved' && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#888" style={{ marginRight: 6 }} />
          <TextInput
            placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'series'}...`}
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(txt) => setSearchQuery(txt)}
            onSubmitEditing={() => {
              setPage(1);
              fetchMedia(1, true);
            }}
          />
        </View>
      )}

      {/* Genre Pills */}
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

      {/* Main List */}
      {loading ? (
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyView}>
          <Ionicons name="film-outline" size={50} color="#444" />
          <Text style={styles.emptyText}>
            {tab === 'saved'
              ? savedSubTab === 'watchlist'
                ? 'No movies added to Watchlist yet.'
                : 'No movies marked as Watched yet.'
              : 'No titles found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.movieList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 15 }} />
            ) : null
          }
          renderItem={({ item }) => {
            const title = item.title || item.name;
            const date = item.release_date || item.first_air_date || 'N/A';
            const isSeries = !!item.first_air_date || mediaType === 'tv';
            const status = getItemStatus(item.id);

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

                {/* Dual Quick Action Icons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.iconBtnAction} onPress={() => toggleSaveItem(item, 'watchlist')}>
                    <Ionicons name={status === 'watchlist' ? 'bookmark' : 'bookmark-outline'} size={20} color={status === 'watchlist' ? '#E50914' : '#888'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtnAction} onPress={() => toggleSaveItem(item, 'watched')}>
                    <Ionicons name={status === 'watched' ? 'checkmark-circle' : 'checkmark-circle-outline'} size={21} color={status === 'watched' ? '#4CAF50' : '#888'} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Details Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
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
              </View>

              <Text style={styles.modalSubtitle}>
                ⭐ {selectedItem && selectedItem.vote_average ? selectedItem.vote_average.toFixed(1) : 'N/A'}/10 | 📅 {selectedItem ? selectedItem.release_date || selectedItem.first_air_date : ''}
              </Text>

              {/* Status Action Buttons in Modal */}
              <View style={styles.modalStatusRow}>
                <TouchableOpacity
                  style={[styles.modalStatusBtn, selectedItem && getItemStatus(selectedItem.id) === 'watchlist' && styles.modalStatusBtnActiveWatchlist]}
                  onPress={() => selectedItem && toggleSaveItem(selectedItem, 'watchlist')}
                >
                  <Ionicons name="bookmark" size={16} color="#fff" />
                  <Text style={styles.modalStatusBtnText}>
                    {selectedItem && getItemStatus(selectedItem.id) === 'watchlist' ? 'In Watchlist' : 'Want to Watch'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalStatusBtn, selectedItem && getItemStatus(selectedItem.id) === 'watched' && styles.modalStatusBtnActiveWatched]}
                  onPress={() => selectedItem && toggleSaveItem(selectedItem, 'watched')}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.modalStatusBtnText}>
                    {selectedItem && getItemStatus(selectedItem.id) === 'watched' ? 'Watched' : 'Mark as Watched'}
                  </Text>
                </TouchableOpacity>
              </View>

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

                  {/* Interactive Top Cast */}
                  {cast.length > 0 ? (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionHeader}>Top Cast (Tap to view movies)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {cast.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.actorCardTouch}
                            activeOpacity={0.7}
                            onPress={() => openActorDetails(c)}
                          >
                            <Image
                              source={{ uri: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://via.placeholder.com/100x150/2c2c2e/ffffff?text=Actor' }}
                              style={styles.actorImg}
                            />
                            <Text style={styles.actorName} numberOfLines={1}>{c.name}</Text>
                            <Text style={styles.actorChar} numberOfLines={1}>{c.character}</Text>
                          </TouchableOpacity>
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
            {/* Actor Filmography Modal */}
      <Modal visible={actorModalVisible} animationType="slide" transparent={false} onRequestClose={() => setActorModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.actorModalHeader}>
            <TouchableOpacity onPress={() => setActorModalVisible(false)} style={styles.actorBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actorHeaderTitle} numberOfLines={1}>{selectedActor ? selectedActor.name : 'Actor'}</Text>
            <View style={{ width: 30 }} />
          </View>

          {actorLoading ? (
            <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 60 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.actorProfileRow}>
                <Image
                  source={{ uri: selectedActor && selectedActor.profile_path ? `${IMAGE_BASE}${selectedActor.profile_path}` : 'https://via.placeholder.com/150' }}
                  style={styles.actorProfileBigImg}
                />
                <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                  <Text style={styles.actorNameBig}>{selectedActor ? selectedActor.name : ''}</Text>
                  <Text style={styles.actorDept}>{selectedActor ? selectedActor.known_for_department : 'Acting'}</Text>
                  {selectedActor && selectedActor.birthday ? (
                    <Text style={styles.actorBirth}>🎂 {selectedActor.birthday}</Text>
                  ) : null}
                  {selectedActor && selectedActor.place_of_birth ? (
                    <Text style={styles.actorBirth} numberOfLines={1}>📍 {selectedActor.place_of_birth}</Text>
                  ) : null}
                </View>
              </View>

              {selectedActor && selectedActor.biography ? (
                <View style={{ marginVertical: 12 }}>
                  <Text style={styles.sectionHeader}>Biography</Text>
                  <Text style={styles.overviewText} numberOfLines={5}>{selectedActor.biography}</Text>
                </View>
              ) : null}

              <Text style={[styles.sectionHeader, { marginTop: 14, marginBottom: 10 }]}>
                Known For ({actorMovies.length} Movies & Series)
              </Text>

              <View style={styles.filmographyGrid}>
                {actorMovies.map((movie, idx) => (
                  <TouchableOpacity
                    key={`${movie.id}-${idx}`}
                    style={styles.gridItem}
                    onPress={() => {
                      setActorModalVisible(false);
                      openDetails(movie);
                    }}
                  >
                    <Image
                      source={{ uri: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/120x180' }}
                      style={styles.gridPoster}
                    />
                    <Text style={styles.gridTitle} numberOfLines={1}>{movie.title || movie.name}</Text>
                    <Text style={styles.gridCharacter} numberOfLines={1}>as {movie.character || 'Self'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* User Profile Card Modal */}
      <Modal visible={profileModalVisible} animationType="fade" transparent onRequestClose={() => setProfileModalVisible(false)}>
        <View style={styles.authModalBg}>
          <View style={styles.profileBox}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={36} color="#fff" />
            </View>
            <Text style={styles.profileNameText}>{currentUser ? currentUser.name : 'User'}</Text>
            <Text style={styles.profileEmailText}>{currentUser ? currentUser.email : ''}</Text>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoText}>
                📌 Watchlist: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{watchlistCount}</Text>
              </Text>
              <Text style={[styles.profileInfoText, { marginTop: 4 }]}>
                ✅ Watched: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{watchedCount}</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutBtnModal} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Logout Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.authCancelBtn} onPress={() => setProfileModalVisible(false)}>
              <Text style={styles.authCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cloud Authentication Modal */}
      <Modal visible={authModalVisible} animationType="fade" transparent onRequestClose={() => setAuthModalVisible(false)}>
        <View style={styles.authModalBg}>
          <View style={styles.authBox}>
            <Text style={styles.authTitle}>
              {authMode === 'signup' ? 'Create Cloud Account' : authMode === 'forgot' ? 'Reset Password' : 'Cloud Login'}
            </Text>
            <Text style={styles.authSubtitle}>
              {authMode === 'signup'
                ? 'Sign up once to sync your watchlist across any device forever'
                : authMode === 'forgot'
                ? 'Enter your registered Gmail & New Password'
                : 'Enter your Gmail ID & Password'}
            </Text>

            {authStatusMessage ? (
              <View style={[styles.statusBox, { backgroundColor: isSuccessMessage ? '#1b5e20' : '#b71c1c' }]}>
                <Text style={styles.statusText}>{authStatusMessage}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.authInput}
              placeholder="Gmail Address (e.g. name@gmail.com)"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={setEmailInput}
            />

            {authMode !== 'forgot' ? (
              <TextInput
                style={styles.authInput}
                placeholder="Password"
                placeholderTextColor="#777"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
              />
            ) : (
              <TextInput
                style={styles.authInput}
                placeholder="Enter New Password"
                placeholderTextColor="#777"
                secureTextEntry
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
              />
            )}

            {authLoading ? (
              <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 10 }} />
            ) : (
              <TouchableOpacity style={styles.authSubmitBtn} onPress={handleCloudAuth}>
                <Text style={styles.authSubmitBtnText}>
                  {authMode === 'signup' ? 'Sign Up' : authMode === 'forgot' ? 'Reset & Login' : 'Login'}
                </Text>
              </TouchableOpacity>
            )}

            {authMode === 'login' && (
              <TouchableOpacity
                style={{ marginTop: 10, alignItems: 'center' }}
                onPress={() => {
                  setAuthMode('forgot');
                  setAuthStatusMessage('');
                }}
              >
                <Text style={{ color: '#E50914', fontSize: 11, fontWeight: 'bold' }}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.authToggleBtn}
              onPress={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthStatusMessage('');
              }}
            >
              <Text style={styles.authToggleText}>
                {authMode === 'signup'
                  ? 'Already have an account? Login'
                  : authMode === 'forgot'
                  ? 'Back to Login'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authCancelBtn}
              onPress={() => {
                setAuthModalVisible(false);
                setEmailInput('');
                setPasswordInput('');
                setNewPasswordInput('');
                setAuthMode('login');
                setAuthStatusMessage('');
              }}
            >
              <Text style={styles.authCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { backgroundColor: '#E50914', padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  headerSubtitle: { fontSize: 9, color: '#888888', fontWeight: '600' },
  userProfileBtn: { alignItems: 'center' },
  usernameText: { color: '#fff', fontSize: 10, maxWidth: 65, textAlign: 'center', marginTop: 2 },
  loginBtnHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E50914', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  loginBtnHeaderText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
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
  savedSubTabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, gap: 10 },
  savedSubTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E', paddingVertical: 8, borderRadius: 8, gap: 6 },
  savedSubTabBtnActive: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#E50914' },
  savedSubTabText: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  savedSubTabTextActive: { color: '#fff' },
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
  cardActions: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 6 },
  iconBtnAction: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 20 },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  backdropBox: { width: '100%', height: 200, position: 'relative' },
  backdropImage: { width: '100%', height: 100 },
  closeBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 4 },
  modalBody: { padding: 14 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', flex: 1 },
  modalSubtitle: { color: '#999', fontSize: 12, marginTop: 2, marginBottom: 10 },
  modalStatusRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modalStatusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#262626', paddingVertical: 8, borderRadius: 6, gap: 6 },
  modalStatusBtnActiveWatchlist: { backgroundColor: '#E50914' },
  modalStatusBtnActiveWatched: { backgroundColor: '#2E7D32' },
  modalStatusBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  trailerBtn: { backgroundColor: '#E50914', paddingVertical: 8, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  trailerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  sectionHeader: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  overviewText: { color: '#bbb', fontSize: 12, lineHeight: 18 },
  actorCardTouch: { width: 70, marginRight: 8, alignItems: 'center' },
  actorImg: { width: 60, height: 80, borderRadius: 6, marginBottom: 2 },
  actorName: { color: '#fff', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  actorChar: { color: '#777', fontSize: 8, textAlign: 'center' },
  actorModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#222' },
  actorBackBtn: { padding: 4 },
  actorHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  actorProfileRow: { flexDirection: 'row', marginBottom: 14 },
  actorProfileBigImg: { width: 90, height: 125, borderRadius: 8 },
  actorNameBig: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  actorDept: { color: '#E50914', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  actorBirth: { color: '#888', fontSize: 11, marginBottom: 2 },
  filmographyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '31%', marginBottom: 14 },
  gridPoster: { width: '100%', height: 140, borderRadius: 6, marginBottom: 4 },
  gridTitle: { color: '#fff', fontSize: 11, fontWeight: '600' },
  gridCharacter: { color: '#777', fontSize: 9 },
  authModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  authBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  authTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  authSubtitle: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 12, marginTop: 4 },
  statusBox: { padding: 8, borderRadius: 6, marginBottom: 12 },
  statusText: { color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  authInput: { backgroundColor: '#262626', color: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, fontSize: 13 },
  authSubmitBtn: { backgroundColor: '#e50914', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  authSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  authToggleBtn: { marginTop: 14, alignItems: 'center' },
  authToggleText: { color: '#aaa', fontSize: 12 },
  authCancelBtn: { marginTop: 12, alignItems: 'center' },
  authCancelText: { color: '#666', fontSize: 12 },
  profileBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  profileAvatar: { backgroundColor: '#E50914', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileNameText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
  profileEmailText: { color: '#888', fontSize: 12, marginTop: 2, marginBottom: 16 },
  profileInfoCard: { backgroundColor: '#262626', width: '100%', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  profileInfoText: { color: '#bbb', fontSize: 13 },
  logoutBtnModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E50914', width: '100%', paddingVertical: 12, borderRadius: 8 },
  logoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});
