import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  Profile,
  SwipeAction,
  SwipeRecord,
  Match,
  Message,
  FilterState,
  BlockReportRecord,
} from '../types';
import { INITIAL_MOCK_PROFILES, AUTO_REPLIES } from '../data/mockProfiles';

interface DatingContextType {
  currentUser: User | null;
  currentProfile: Profile | null;
  activeTab: 'discovery' | 'likes' | 'matches' | 'profile';
  setActiveTab: (tab: 'discovery' | 'likes' | 'matches' | 'profile') => void;
  activeChatMatchId: string | null;
  setActiveChatMatchId: (id: string | null) => void;
  
  // Discovery stack & Swipes
  candidateProfiles: Profile[];
  currentCandidate: Profile | null;
  swipes: SwipeRecord[];
  swipe: (action: SwipeAction) => void;
  rewindLastSwipe: () => boolean;
  canRewind: boolean;
  
  // Matches & Chat
  matches: Match[];
  messages: Record<string, Message[]>;
  sendMessage: (matchId: string, content: string, type?: 'TEXT' | 'IMAGE', imageUrl?: string) => void;
  activeMatchModal: Profile | null;
  closeMatchModal: () => void;
  
  // Likes You
  likedMeProfiles: Profile[];
  
  // Modals & Sheets
  detailProfileModal: Profile | null;
  setDetailProfileModal: (profile: Profile | null) => void;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  isPremiumModalOpen: boolean;
  setIsPremiumModalOpen: (open: boolean) => void;
  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isDownloadModalOpen: boolean;
  setIsDownloadModalOpen: (open: boolean) => void;
  blockReportModal: { target: Profile; type: 'BLOCK' | 'REPORT' } | null;
  setBlockReportModal: (val: { target: Profile; type: 'BLOCK' | 'REPORT' } | null) => void;
  
  // Boost & Premium
  activateBoost: () => boolean;
  isBoostActive: boolean;
  boostTimeRemaining: number;
  upgradePremium: (tier: '1_month' | '3_months' | '6_months' | '12_months') => void;
  
  // Filters
  filters: FilterState;
  updateFilters: (newFilters: Partial<FilterState>) => void;
  
  // Auth & Onboarding
  login: (email: string, isDemoReady?: boolean) => void;
  register: (email: string) => void;
  logout: () => void;
  completeOnboarding: (data: Partial<Profile>) => void;
  updateProfile: (data: Partial<Profile>) => void;
  
  // Safety actions
  blockUser: (targetId: string) => void;
  reportUser: (targetId: string, reason: string) => void;
  resetAllData: () => void;
  
  // Toasts
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const DatingContext = createContext<DatingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'cupid_user_v1',
  PROFILE: 'cupid_profile_v1',
  SWIPES: 'cupid_swipes_v1',
  MATCHES: 'cupid_matches_v1',
  MESSAGES: 'cupid_messages_v1',
  BLOCKED: 'cupid_blocked_v1',
  FILTERS: 'cupid_filters_v1',
};

const DEFAULT_FILTERS: FilterState = {
  gender: 'BOTH',
  minAge: 18,
  maxAge: 40,
  maxDistance: 50,
  selectedInterests: [],
  verifiedOnly: false,
};

const DEFAULT_CURRENT_PROFILE: Profile = {
  userId: 'user_me_001',
  displayName: 'Đăng Khoa',
  gender: 'MALE',
  birthDate: '1999-05-15',
  age: 25,
  bio: 'Product Designer tại Sài Gòn ✨ Thích cà phê specialty, âm nhạc indie và nhiếp ảnh đường phố. Tìm một người bạn chân thành để cùng chia sẻ những điều giản dị.',
  photos: [
    '/src/assets/images/cupid_minh_portrait_1791186060876.jpg',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  ],
  locationName: 'Quận 1, TP. Hồ Chí Minh',
  latitude: 10.7769,
  longitude: 106.7009,
  distanceKm: 0,
  targetGender: 'FEMALE',
  minAgePref: 20,
  maxAgePref: 30,
  maxDistancePref: 35,
  interests: ['Cà phê', 'Thiết kế', 'Nhiếp ảnh', 'Du lịch', 'Âm nhạc', 'Board game'],
  lookingFor: 'Người yêu lâu dài',
  jobTitle: 'Senior Product Designer',
  company: 'Fintech Studio',
  education: 'ĐH Kiến Trúc TP.HCM',
  zodiac: 'Kim Ngưu',
  heightCm: 175,
  lifestyle: {
    drinking: 'Thỉnh thoảng cocktail',
    smoking: 'Không hút thuốc',
    exercise: 'Gym 3 lần/tuần',
    pets: 'Yêu cún & mèo',
  },
  compatibilityRate: 98,
  isVerified: true,
};

export const DatingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Navigation tabs
  const [activeTab, setActiveTab] = useState<'discovery' | 'likes' | 'matches' | 'profile'>('discovery');
  const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(null);

  // 3. Swipes & History
  const [swipes, setSwipes] = useState<SwipeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SWIPES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [swipeHistory, setSwipeHistory] = useState<{ profile: Profile; action: SwipeAction }[]>([]);

  // 4. Matches
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 5. Messages
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 6. Blocked users
  const [blockedIds, setBlockedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BLOCKED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 7. Filters
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
      return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  // 8. Modals
  const [activeMatchModal, setActiveMatchModal] = useState<Profile | null>(null);
  const [detailProfileModal, setDetailProfileModal] = useState<Profile | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [blockReportModal, setBlockReportModal] = useState<{ target: Profile; type: 'BLOCK' | 'REPORT' } | null>(null);

  // 9. Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Sync to localStorage
  useEffect(() => {
    if (currentUser) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  }, [currentUser]);

  useEffect(() => {
    if (currentProfile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(currentProfile));
    else localStorage.removeItem(STORAGE_KEYS.PROFILE);
  }, [currentProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SWIPES, JSON.stringify(swipes));
  }, [swipes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(blockedIds));
  }, [blockedIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  }, [filters]);

  // Boost timer management
  const [boostTimeRemaining, setBoostTimeRemaining] = useState<number>(0);
  const isBoostActive = boostTimeRemaining > 0;

  useEffect(() => {
    if (!currentUser?.boostActiveUntil) {
      setBoostTimeRemaining(0);
      return;
    }
    const checkBoost = () => {
      const diff = Math.max(0, Math.floor((new Date(currentUser.boostActiveUntil!).getTime() - Date.now()) / 1000));
      setBoostTimeRemaining(diff);
      if (diff === 0 && currentUser.boostActiveUntil) {
        setCurrentUser(prev => prev ? { ...prev, boostActiveUntil: undefined } : null);
      }
    };
    checkBoost();
    const interval = setInterval(checkBoost, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.boostActiveUntil]);

  // Filter candidate profiles
  const swipedIds = new Set(swipes.map((s) => s.targetId));
  const candidateProfiles = INITIAL_MOCK_PROFILES.filter((p) => {
    if (blockedIds.includes(p.userId)) return false;
    if (swipedIds.has(p.userId)) return false;

    // Filter by gender preference
    if (filters.gender !== 'BOTH' && p.gender !== filters.gender) return false;

    // Filter by age
    if (p.age < filters.minAge || p.age > filters.maxAge) return false;

    // Filter by distance
    if (p.distanceKm > filters.maxDistance) return false;

    // Filter by interests (if any selected)
    if (filters.selectedInterests.length > 0) {
      const hasCommon = p.interests.some((i) => filters.selectedInterests.includes(i));
      if (!hasCommon) return false;
    }

    if (filters.verifiedOnly && !p.isVerified) return false;

    return true;
  });

  const currentCandidate = candidateProfiles[0] || null;

  // Profiles that have liked current user
  const likedMeProfiles = INITIAL_MOCK_PROFILES.filter(
    (p) => p.hasLikedCurrentUser && !blockedIds.includes(p.userId)
  );

  // Swipe Action Handler
  const swipe = (action: SwipeAction) => {
    if (!currentCandidate || !currentUser) return;

    const target = currentCandidate;
    const newSwipe: SwipeRecord = {
      id: `swipe_${Date.now()}`,
      swiperId: currentUser.id,
      targetId: target.userId,
      action,
      createdAt: new Date().toISOString(),
    };

    setSwipes((prev) => [...prev, newSwipe]);
    setSwipeHistory((prev) => [...prev, { profile: target, action }]);

    // Check for Match
    if ((action === 'LIKE' || action === 'SUPER_LIKE') && target.hasLikedCurrentUser) {
      const newMatch: Match = {
        id: `match_${Date.now()}`,
        user1Id: currentUser.id,
        user2Id: target.userId,
        matchedAt: new Date().toISOString(),
        partnerProfile: target,
        lastMessage: action === 'SUPER_LIKE' ? '⭐ Bạn đã Siêu Thích người này!' : 'Tương hợp mới! Hãy gửi lời chào ngay.',
        lastMessageTime: 'Vừa xong',
        unreadCount: 0,
      };

      setMatches((prev) => [newMatch, ...prev.filter((m) => m.partnerProfile.userId !== target.userId)]);
      setActiveMatchModal(target);

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF4458', '#FE6B8B', '#FFD700', '#FF758C'],
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      if (action === 'SUPER_LIKE') {
        showToast(`Đã gửi Siêu Thích ⭐ cho ${target.displayName}!`);
      }
    }
  };

  // Rewind last swipe
  const canRewind = swipeHistory.length > 0;
  const rewindLastSwipe = (): boolean => {
    if (!canRewind) {
      showToast('Không có lượt vuốt nào để hoàn tác!');
      return false;
    }

    if (!currentUser?.isPremium && (currentUser?.rewindRemaining ?? 0) <= 0) {
      setIsPremiumModalOpen(true);
      return false;
    }

    const last = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory((prev) => prev.slice(0, -1));
    setSwipes((prev) => prev.filter((s) => s.targetId !== last.profile.userId));

    // Also remove match if it was created
    setMatches((prev) => prev.filter((m) => m.partnerProfile.userId !== last.profile.userId));

    if (!currentUser?.isPremium) {
      setCurrentUser((prev) =>
        prev ? { ...prev, rewindRemaining: Math.max(0, prev.rewindRemaining - 1) } : null
      );
    }

    showToast(`Đã quay lại hồ sơ của ${last.profile.displayName}`);
    return true;
  };

  // Boost Profile
  const activateBoost = (): boolean => {
    if (!currentUser) return false;
    const boostUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    setCurrentUser((prev) => (prev ? { ...prev, boostActiveUntil: boostUntil } : null));

    showToast('⚡ Tăng Tốc đã kích hoạt! Hồ sơ của bạn đang đứng đầu khu vực trong 30 phút.');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6'],
      });
    } catch {}
    return true;
  };

  // Send message & Auto-reply simulation
  const sendMessage = (
    matchId: string,
    content: string,
    type: 'TEXT' | 'IMAGE' = 'TEXT',
    imageUrl?: string
  ) => {
    if (!currentUser) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      matchId,
      senderId: currentUser.id,
      content,
      type,
      imageUrl,
      isRead: false,
      sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newMessage],
    }));

    // Update match last message
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              lastMessage: type === 'IMAGE' ? '📷 [Hình ảnh]' : content,
              lastMessageTime: 'Vừa xong',
            }
          : m
      )
    );

    // Auto reply simulation after 1.5s
    const targetMatch = matches.find((m) => m.id === matchId);
    if (targetMatch) {
      const partnerId = targetMatch.partnerProfile.userId;
      const replies = AUTO_REPLIES[partnerId] || [
        'Cảm ơn bạn nhé! Thật vui khi được kết nối cùng bạn ❤️',
        'Mình vừa online nè! Rất vui được trò chuyện với bạn.',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      setTimeout(() => {
        const replyMsg: Message = {
          id: `msg_reply_${Date.now()}`,
          matchId,
          senderId: partnerId,
          content: randomReply,
          type: 'TEXT',
          isRead: true,
          sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), replyMsg],
        }));

        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  lastMessage: randomReply,
                  lastMessageTime: 'Vừa xong',
                }
              : m
          )
        );
      }, 1600);
    }
  };

  // Close match celebration modal
  const closeMatchModal = () => {
    setActiveMatchModal(null);
  };

  // Block & Report
  const blockUser = (targetId: string) => {
    setBlockedIds((prev) => [...prev, targetId]);
    setSwipes((prev) => prev.filter((s) => s.targetId !== targetId));
    setMatches((prev) => prev.filter((m) => m.partnerProfile.userId !== targetId));
    setDetailProfileModal(null);
    setBlockReportModal(null);
    showToast('Đã chặn người dùng thành công.');
  };

  const reportUser = (targetId: string, reason: string) => {
    blockUser(targetId);
    showToast(`Đã gửi báo cáo vi phạm: "${reason}". Cảm ơn bạn đã giữ an toàn cho cộng đồng!`);
  };

  // Filters
  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    showToast('Đã cập nhật bộ lọc khám phá.');
  };

  // Auth
  const login = (email: string, isDemoReady = true) => {
    const user: User = {
      id: 'user_me_001',
      email,
      phoneNumber: '0912345678',
      isPremium: isDemoReady,
      premiumTier: isDemoReady ? '3_months' : undefined,
      isCompleted: isDemoReady,
      superLikesRemaining: 5,
      rewindRemaining: 5,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);

    if (isDemoReady) {
      setCurrentProfile(DEFAULT_CURRENT_PROFILE);
      // Pre-seed an initial match to make test chats instant!
      const initialMatchUser = INITIAL_MOCK_PROFILES[0];
      const seededMatch: Match = {
        id: 'match_seed_01',
        user1Id: user.id,
        user2Id: initialMatchUser.userId,
        matchedAt: new Date(Date.now() - 3600000).toISOString(),
        partnerProfile: initialMatchUser,
        lastMessage: 'Chào bạn nè! Thấy tụi mình match bất ngờ ghê...',
        lastMessageTime: '10:30',
        unreadCount: 1,
      };
      setMatches([seededMatch]);
      setMessages({
        match_seed_01: [
          {
            id: 'msg_seed_1',
            matchId: 'match_seed_01',
            senderId: initialMatchUser.userId,
            content: 'Chào bạn nè! Thấy tụi mình match bất ngờ ghê, bạn cũng thích nghe nhạc indie với cà phê ngắm phố hả? 🌸',
            type: 'TEXT',
            isRead: true,
            sentAt: '10:30',
          },
        ],
      });
    } else {
      setCurrentProfile(null);
    }
  };

  const register = (email: string) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      isPremium: false,
      isCompleted: false, // Forces onboarding flow!
      superLikesRemaining: 1,
      rewindRemaining: 1,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(newUser);
    setCurrentProfile(null);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentProfile(null);
    setActiveTab('discovery');
    setActiveChatMatchId(null);
  };

  const completeOnboarding = (data: Partial<Profile>) => {
    if (!currentUser) return;

    const completedProfile: Profile = {
      ...DEFAULT_CURRENT_PROFILE,
      ...data,
      userId: currentUser.id,
    };

    setCurrentProfile(completedProfile);
    setCurrentUser((prev) => (prev ? { ...prev, isCompleted: true } : null));
    setActiveTab('discovery');
    showToast('🎉 Chúc mừng bạn đã hoàn tất hồ sơ! Bắt đầu kết nối ngay.');
  };

  const updateProfile = (data: Partial<Profile>) => {
    setCurrentProfile((prev) => (prev ? { ...prev, ...data } : null));
    showToast('Đã lưu thông tin hồ sơ.');
  };

  // Upgrade Premium
  const upgradePremium = (tier: '1_month' | '3_months' | '6_months' | '12_months') => {
    if (!currentUser) return;
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            isPremium: true,
            premiumTier: tier,
            superLikesRemaining: 99,
            rewindRemaining: 99,
          }
        : null
    );
    setIsPremiumModalOpen(false);
    showToast('✨ Chúc mừng! Bạn đã nâng cấp CupidGo VIP thành công!');
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF4458'],
      });
    } catch {}
  };

  // Reset demo
  const resetAllData = () => {
    localStorage.clear();
    setSwipes([]);
    setMatches([]);
    setMessages({});
    setBlockedIds([]);
    setFilters(DEFAULT_FILTERS);
    setSwipeHistory([]);
    login('demo@cupidgo.vn', true);
    showToast('Đã đặt lại dữ liệu ứng dụng về mặc định.');
  };

  return (
    <DatingContext.Provider
      value={{
        currentUser,
        currentProfile,
        activeTab,
        setActiveTab,
        activeChatMatchId,
        setActiveChatMatchId,
        candidateProfiles,
        currentCandidate,
        swipes,
        swipe,
        rewindLastSwipe,
        canRewind,
        matches,
        messages,
        sendMessage,
        activeMatchModal,
        closeMatchModal,
        likedMeProfiles,
        detailProfileModal,
        setDetailProfileModal,
        isFilterModalOpen,
        setIsFilterModalOpen,
        isPremiumModalOpen,
        setIsPremiumModalOpen,
        isEditProfileModalOpen,
        setIsEditProfileModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isDownloadModalOpen,
        setIsDownloadModalOpen,
        blockReportModal,
        setBlockReportModal,
        activateBoost,
        isBoostActive,
        boostTimeRemaining,
        upgradePremium,
        filters,
        updateFilters,
        login,
        register,
        logout,
        completeOnboarding,
        updateProfile,
        blockUser,
        reportUser,
        resetAllData,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </DatingContext.Provider>
  );
};

export const useDating = () => {
  const context = useContext(DatingContext);
  if (!context) throw new Error('useDating must be used within DatingProvider');
  return context;
};
