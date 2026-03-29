import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const COLORS = {
  farmer: { primary: '#2e7d32', light: '#e8f5e9' },
  villager: { primary: '#1565c0', light: '#e3f2fd' },
  gramsevak: { primary: '#b71c1c', light: '#ffebee' },
  healthworker: { primary: '#b71c1c', light: '#ffebee' },
  doctor: { primary: '#6a1b9a', light: '#f3e5f5' },
};

export default function CommunityFeedScreen() {
  const { user, getVillage, liveVillage } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [currentVillage, setCurrentVillage] = useState('');

  const roleColor = COLORS[user?.role] || COLORS.villager;
  const isAuthority = ['gramsevak', 'doctor', 'healthworker'].includes(user?.role);

  useEffect(() => {
    if (user?.role === 'farmer') setActiveTab('crop');
    else if (user?.role === 'villager') setActiveTab('health');
    else if (user?.role === 'doctor') setActiveTab('health');
    else setActiveTab('all');
    fetchPosts();
  }, []);

  // Wait for live village before fetching
  useEffect(() => {
    const village = liveVillage || user?.village || '';
    if (village && village !== currentVillage) {
      setCurrentVillage(village);
      fetchPosts(village);
    }
  }, [liveVillage]);

  // Initial fetch with whatever village is available
  useEffect(() => {
    const village = getVillage();
    setCurrentVillage(village);
    fetchPosts(village);
  }, []);

  const fetchPosts = async (village) => {
    try {
      const v = village || getVillage();
      if (!v) return;
      const res = await api.get(`/community/feed?village=${v}`);
      setPosts(res.data.data || []);
    } catch (error) {
      console.log('Feed error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts(getVillage());
    setRefreshing(false);
  };

  const handlePost = async () => {
    if (!newPost.trim()) return Alert.alert(t('error'), 'Write something first!');
    setPosting(true);
    try {
      const category =
        user?.role === 'farmer' ? 'crop' :
        user?.role === 'villager' ? 'health' :
        user?.role === 'gramsevak' ? 'health' :
        user?.role === 'doctor' ? 'health' : 'general';

      await api.post('/community/post', {
        content: newPost,
        village: getVillage(),
        category,
        visibility
      });

      setNewPost('');
      setVisibility('public');
      await fetchPosts(getVillage());
    } catch (error) {
      Alert.alert(t('error'), 'Could not post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await api.post(`/community/post/${postId}/like`);
      await fetchPosts(getVillage());
    } catch (error) {
      console.log('Like error:', error.message);
    }
  };

  const handleComment = async (postId) => {
    const text = replyText[postId];
    if (!text?.trim()) return;
    try {
      await api.post(`/community/post/${postId}/comment`, { text });
      setReplyText(prev => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);
      await fetchPosts(getVillage());
    } catch (error) {
      Alert.alert(t('error'), 'Could not post comment');
    }
  };

  const getFilteredPosts = () => {
    if (activeTab === 'crop') return posts.filter(p => p.category === 'crop');
    if (activeTab === 'health') return posts.filter(p => p.category === 'health');
    return posts;
  };

  const getRoleEmoji = (role) => {
    const emojis = {
      farmer: '🧑‍🌾', villager: '👨‍👩‍👧',
      healthworker: '👩‍⚕️', gramsevak: '👨‍⚕️', doctor: '🩺'
    };
    return emojis[role] || '👤';
  };

  const getRoleColor = (role) => COLORS[role]?.primary || '#666';

  const getRoleBadgeLabel = (role) => {
    if (role === 'gramsevak') return t('gramsevak');
    if (role === 'doctor') return t('doctor');
    if (role === 'healthworker') return 'Health Worker';
    return '';
  };

  const getRoleBadgeEmoji = (role) => {
    if (role === 'gramsevak') return '👨‍⚕️';
    if (role === 'doctor') return '🩺';
    if (role === 'healthworker') return '👩‍⚕️';
    return '';
  };

  const isAuthorityRole = (role) =>
    ['gramsevak', 'doctor', 'healthworker'].includes(role);

  const canReply = (item) => {
    return isAuthority ||
      item.userId?._id === user?._id ||
      item.userId === user?._id;
  };

  const getCategoryColor = (category) => {
    if (category === 'crop') return '#2e7d32';
    if (category === 'health') return '#c62828';
    return '#666';
  };

  const getCategoryEmoji = (category) => {
    if (category === 'crop') return '🌾';
    if (category === 'health') return '🏥';
    return '💬';
  };

  const getTabs = () => {
    if (user?.role === 'doctor') return [
      { key: 'all', label: `📋 All` },
      { key: 'health', label: `🏥 ${t('health_cards')}` }
    ];
    if (user?.role === 'gramsevak' || user?.role === 'healthworker') return [
      { key: 'all', label: `📋 All` },
      { key: 'crop', label: `🌾 ${t('crop_reports')}` },
      { key: 'health', label: `🏥 ${t('health_cards')}` }
    ];
    if (user?.role === 'farmer') return [
      { key: 'crop', label: `🌾 ${t('crop_reports')}` }
    ];
    return [{ key: 'health', label: `🏥 ${t('health_cards')}` }];
  };

  const getPostPlaceholder = () => {
    if (user?.role === 'farmer') return `🌾 ${t('post_advisory')}...`;
    if (user?.role === 'gramsevak') return `👨‍⚕️ ${t('post_advisory')}...`;
    if (user?.role === 'doctor') return `🩺 ${t('post_advisory')}...`;
    return `💬 ${t('post_advisory')}...`;
  };

  const renderPost = ({ item }) => {
    const isGramSevakOnly = item.visibility === 'gramsevak_only';
    const postRoleBadge = getRoleBadgeLabel(item.userId?.role);
    const postRoleEmoji = getRoleBadgeEmoji(item.userId?.role);

    return (
      <View style={[
        styles.postCard,
        isAuthorityRole(item.userId?.role) && {
          borderLeftWidth: 3,
          borderLeftColor: getRoleColor(item.userId?.role)
        },
        isGramSevakOnly && styles.privatePost
      ]}>
        {isGramSevakOnly && (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>🔒 {t('gramsevak_only')}</Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <Text style={styles.postAvatar}>
            {getRoleEmoji(item.userId?.role)}
          </Text>
          <View style={styles.postMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.postName}>
                {item.userId?.name || 'Unknown'}
              </Text>
              {postRoleBadge ? (
                <View style={[styles.authorityBadge,
                  { backgroundColor: getRoleColor(item.userId?.role) + '22' }]}>
                  <Text style={[styles.authorityBadgeText,
                    { color: getRoleColor(item.userId?.role) }]}>
                    {postRoleEmoji} {postRoleBadge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.postDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          </View>
          <View style={[styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>
              {getCategoryEmoji(item.category)} {item.category || 'general'}
            </Text>
          </View>
        </View>

        <Text style={styles.postContent}>
          {item.content || ''}
        </Text>

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLike(item._id)}
          >
            <Text style={styles.actionBtnText}>
              {'👍 ' + (item.likes?.length || 0)}
            </Text>
          </TouchableOpacity>

          {canReply(item) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setReplyingTo(
                replyingTo === item._id ? null : item._id
              )}
            >
              <Text style={styles.actionBtnText}>
                {'💬 ' + (item.comments?.length || 0) + ' ' + t('reply')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.comments?.length > 0 && (
          <View style={styles.commentsSection}>
            {item.comments.map((c, i) => {
              const commentBadge = getRoleBadgeLabel(c.userRole);
              const commentEmoji = getRoleBadgeEmoji(c.userRole);
              return (
                <View key={i} style={[
                  styles.comment,
                  isAuthorityRole(c.userRole) && {
                    backgroundColor: getRoleColor(c.userRole) + '11',
                    borderLeftWidth: 3,
                    borderLeftColor: getRoleColor(c.userRole)
                  }
                ]}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {getRoleEmoji(c.userRole)} {c.userName || 'User'}
                    </Text>
                    {commentBadge ? (
                      <View style={[styles.commentBadge,
                        { backgroundColor: getRoleColor(c.userRole) + '22' }]}>
                        <Text style={[styles.commentBadgeText,
                          { color: getRoleColor(c.userRole) }]}>
                          {commentEmoji} {commentBadge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.commentText}>
                    {c.text || ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {replyingTo === item._id && (
          <View style={[styles.replyBox,
            isAuthority && {
              borderColor: roleColor.primary, borderWidth: 1
            }]}>
            <TextInput
              style={styles.replyInput}
              placeholder={
                user?.role === 'gramsevak' ? `👨‍⚕️ ${t('send_advice')}...` :
                user?.role === 'doctor' ? `🩺 ${t('send_advice')}...` :
                `💬 ${t('reply')}...`
              }
              value={replyText[item._id] || ''}
              onChangeText={v => setReplyText(
                prev => ({ ...prev, [item._id]: v })
              )}
              multiline
              autoFocus
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReplyingTo(null)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: roleColor.primary }]}
                onPress={() => handleComment(item._id)}
              >
                <Text style={styles.sendBtnText}>
                  {isAuthority ? t('send_advice') : t('send_prescription')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={roleColor.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: roleColor.light }]}>
      <View style={[styles.header, { backgroundColor: roleColor.primary }]}>
        <Text style={styles.headerTitle}>{'👥 ' + t('community_feed')}</Text>
        <Text style={styles.headerSub}>
          {'📍 ' + (liveVillage || user?.village || '')}
        </Text>
        {isAuthority ? (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {getRoleBadgeEmoji(user?.role) + ' ' + getRoleBadgeLabel(user?.role) + ' — All Posts Visible'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tabRow}>
        {getTabs().map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab,
              activeTab === tab.key && { backgroundColor: roleColor.primary }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText,
              activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.newPostCard}>
        <TextInput
          style={styles.postInput}
          placeholder={getPostPlaceholder()}
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />

        {!isAuthority && (
          <TouchableOpacity
            style={styles.visibilityBtn}
            onPress={() => setShowVisibilityModal(true)}
          >
            <Text style={styles.visibilityBtnText}>
              {visibility === 'public'
                ? `🌍 ${t('public')} — ${t('everyone_village')}`
                : `🔒 ${t('gramsevak_only')}`}
            </Text>
            <Text style={styles.visibilityBtnArrow}>{'▼'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.postBtn,
            posting && { backgroundColor: '#aaa' },
            { backgroundColor: roleColor.primary }
          ]}
          onPress={handlePost}
          disabled={posting}
        >
          {posting
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.postBtnText}>
                {isAuthority ? `📢 ${t('post_advisory')}` : t('post')}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredPosts()}
        renderItem={renderPost}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>{'🌾'}</Text>
            <Text style={styles.emptyText}>{t('no_posts')}</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showVisibilityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('who_can_see')}?</Text>

            <TouchableOpacity
              style={[styles.visibilityOption,
                visibility === 'public' && {
                  borderColor: roleColor.primary,
                  backgroundColor: roleColor.light
                }]}
              onPress={() => {
                setVisibility('public');
                setShowVisibilityModal(false);
              }}
            >
              <Text style={styles.visibilityOptionEmoji}>🌍</Text>
              <View style={styles.visibilityOptionInfo}>
                <Text style={styles.visibilityOptionTitle}>{t('public')}</Text>
                <Text style={styles.visibilityOptionDesc}>
                  {t('everyone_village')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption,
                visibility === 'gramsevak_only' && {
                  borderColor: '#b71c1c',
                  backgroundColor: '#ffebee'
                }]}
              onPress={() => {
                setVisibility('gramsevak_only');
                setShowVisibilityModal(false);
              }}
            >
              <Text style={styles.visibilityOptionEmoji}>🔒</Text>
              <View style={styles.visibilityOptionInfo}>
                <Text style={styles.visibilityOptionTitle}>{t('gramsevak_only')}</Text>
                <Text style={styles.visibilityOptionDesc}>
                  {t('only_gramsevak')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setShowVisibilityModal(false)}
            >
              <Text style={styles.cancelModalText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 4, marginTop: 8
  },
  headerBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  tabRow: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 8, gap: 8, elevation: 2
  },
  tab: {
    flex: 1, padding: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#f5f5f5'
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
  newPostCard: {
    margin: 12, backgroundColor: 'white',
    borderRadius: 16, padding: 16, elevation: 3
  },
  postInput: {
    fontSize: 15, color: '#333',
    minHeight: 50, textAlignVertical: 'top'
  },
  visibilityBtn: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#f5f5f5',
    borderRadius: 10, padding: 10, marginTop: 8
  },
  visibilityBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  visibilityBtnArrow: { fontSize: 12, color: '#888' },
  postBtn: {
    borderRadius: 10, padding: 10,
    alignItems: 'center', marginTop: 8
  },
  postBtnText: { color: 'white', fontWeight: 'bold' },
  postCard: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, elevation: 2
  },
  privatePost: {
    backgroundColor: '#fffde7',
    borderWidth: 1, borderColor: '#f9a825'
  },
  privateBadge: {
    backgroundColor: '#fff8e1', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8
  },
  privateBadgeText: { fontSize: 11, color: '#f57f17', fontWeight: 'bold' },
  postHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, gap: 8
  },
  postAvatar: { fontSize: 28 },
  postMeta: { flex: 1 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, flexWrap: 'wrap'
  },
  postName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  authorityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  authorityBadgeText: { fontSize: 10, fontWeight: 'bold' },
  postDate: { fontSize: 12, color: '#999', marginTop: 2 },
  categoryBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  categoryText: { fontSize: 11, color: 'white', fontWeight: '600' },
  postContent: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 10 },
  postActions: {
    flexDirection: 'row', gap: 16,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0'
  },
  actionBtn: { padding: 4 },
  actionBtnText: { fontSize: 14, color: '#666' },
  commentsSection: {
    marginTop: 8, backgroundColor: '#f9f9f9',
    borderRadius: 10, padding: 10, gap: 8
  },
  comment: { backgroundColor: 'white', borderRadius: 8, padding: 8 },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 4, flexWrap: 'wrap'
  },
  commentAuthor: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  commentBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  commentBadgeText: { fontSize: 10, fontWeight: 'bold' },
  commentText: { fontSize: 13, color: '#555' },
  replyBox: {
    marginTop: 10, backgroundColor: '#f5f5f5',
    borderRadius: 10, padding: 10
  },
  replyInput: {
    fontSize: 14, color: '#333',
    minHeight: 40, textAlignVertical: 'top'
  },
  replyActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 8, marginTop: 8
  },
  cancelBtn: {
    padding: 8, paddingHorizontal: 16,
    borderRadius: 8, backgroundColor: '#e0e0e0'
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  sendBtn: { padding: 8, paddingHorizontal: 16, borderRadius: 8 },
  sendBtnText: { color: 'white', fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold',
    color: '#333', marginBottom: 16
  },
  visibilityOption: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 16, borderRadius: 12,
    borderWidth: 2, borderColor: '#e0e0e0', marginBottom: 10
  },
  visibilityOptionEmoji: { fontSize: 28 },
  visibilityOptionInfo: { flex: 1 },
  visibilityOptionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  visibilityOptionDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  cancelModalBtn: {
    padding: 14, alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12, marginTop: 4
  },
  cancelModalText: { color: '#666', fontWeight: 'bold', fontSize: 15 }
});