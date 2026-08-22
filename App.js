import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity,
  Modal, SafeAreaView, ScrollView, TextInput, ActivityIndicator,
  Linking, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
