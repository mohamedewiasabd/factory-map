import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Users, 
  Clock, 
  Plus, 
  Building2,
  AlertCircle,
  HelpCircle,
  Phone,
  CornerDownLeft
} from 'lucide-react';
import { 
  Conversation, 
  Message, 
  Factory, 
  OrderProposal, 
  ConversationType 
} from '../types';
import { 
  fetchUserConversations, 
  fetchConversationMessages, 
  sendMessage, 
  createConversation,
  createOrder,
  createNotification
} from '../services/dataService';
import { askFactoryAutoResponder } from '../services/aiService';
import { ModalShell } from './ModalShell';

interface UnifiedChatProps {
  currentUser: any;
  factories: Factory[];
  initialConversationId?: string;
  initialFactory?: Factory | null;
  initialTargetRole?: 'sales' | 'purchasing' | 'support' | 'team';
  onOrderCreatedFromChat: (orderId: string) => void;
  isAdmin: boolean;
}

export const UnifiedChat: React.FC<UnifiedChatProps> = ({
  currentUser,
  factories,
  initialConversationId,
  initialFactory,
  initialTargetRole = 'sales',
  onOrderCreatedFromChat,
  isAdmin
}) => {
  const [activeTypeTab, setActiveTypeTab] = useState<ConversationType>('b2b_factory');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiEnabledForThisConv, setAiEnabledForThisConv] = useState(true);

  // New Support Chat modal or factory chooser
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedFactoryForNewChat, setSelectedFactoryForNewChat] = useState<Factory | null>(null);
  const [selectedRoleForNewChat, setSelectedRoleForNewChat] = useState<'sales' | 'purchasing'>('sales');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [currentUser, activeTypeTab]);

  // Handle incoming props to start or switch to a specific conversation
  useEffect(() => {
    if (initialFactory) {
      const role: 'sales' | 'purchasing' = initialTargetRole === 'purchasing' ? 'purchasing' : 'sales';
      handleInitiateChat(initialFactory, role);
    }
  }, [initialFactory, initialTargetRole]);

  const loadConversations = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userEmail = currentUser.email?.toLowerCase().trim();
      const managedFactoryIds = factories
        .filter((f) => 
          f.salesOfficer?.email?.toLowerCase().trim() === userEmail ||
          f.purchasingOfficer?.email?.toLowerCase().trim() === userEmail ||
          f.ownerEmail?.toLowerCase().trim() === userEmail ||
          f.ownerId === currentUser.uid
        )
        .map((f) => f.id);

      const allConvs = await fetchUserConversations(currentUser.uid, managedFactoryIds);
      setConversations(allConvs);

      // Select active or first conversation matching type
      if (!activeConv && allConvs.length > 0) {
        const matching = allConvs.find((c) => c.type === activeTypeTab);
        if (matching) {
          selectConversation(matching);
        } else {
          selectConversation(allConvs[0]);
        }
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    try {
      const msgs = await fetchConversationMessages(conv.id);
      setMessages(msgs);
      setAiEnabledForThisConv(conv.isAiActive ?? true);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  // Start new chat with a factory or support
  const handleInitiateChat = async (factory: Factory, targetRole: 'sales' | 'purchasing') => {
    if (!currentUser) return;

    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.factoryId === factory.id && c.targetRole === targetRole && c.participants.includes(currentUser.uid)
    );

    if (existing) {
      setActiveTypeTab('b2b_factory');
      selectConversation(existing);
      return;
    }

    try {
      const newConv = await createConversation({
        type: 'b2b_factory',
        factoryId: factory.id,
        factoryName: factory.name,
        targetRole,
        participants: [currentUser.uid, factory.ownerId || 'system-seed'],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || currentUser.email?.split('@')[0] || 'العميل',
          [factory.ownerId || 'system-seed']: `${factory.name} (${targetRole === 'sales' ? 'المبيعات' : 'المشتريات'})`,
        },
        isAiActive: factory.aiAutoResponderEnabled ?? true,
      });

      setConversations([newConv, ...conversations]);
      setActiveTypeTab('b2b_factory');
      setActiveConv(newConv);

      // Send initial welcome message
      const welcome = await sendMessage(newConv.id, {
        conversationId: newConv.id,
        senderId: 'ai_assistant',
        senderName: `المساعد الآلي - ${factory.name}`,
        senderRole: targetRole === 'sales' ? 'مسؤول المبيعات' : 'مسؤول المشتريات',
        text: `مرحباً بك في قسم ${targetRole === 'sales' ? 'المبيعات' : 'المشتريات'} بمصنع ${factory.name}. أنا هنا لمساعدتك في الاستفسار عن الأسعار، المواصفات الفنية، والكميات، وتحويل طلبك لأمر شراء رسمي فوراً. كيف يمكنني خدمتك اليوم؟`,
        isAi: true,
      });

      setMessages([welcome]);
    } catch (e) {
      console.error('Error creating conversation:', e);
    }
  };

  // Start direct Support chat with platform admin
  const handleStartSupportChat = async () => {
    if (!currentUser) return;

    const existing = conversations.find((c) => c.type === 'support_admin' && c.participants.includes(currentUser.uid));
    if (existing) {
      setActiveTypeTab('support_admin');
      selectConversation(existing);
      return;
    }

    try {
      const newConv = await createConversation({
        type: 'support_admin',
        factoryName: 'فريق الدعم الفني وإدارة المنصة',
        targetRole: 'support',
        participants: [currentUser.uid, 'admin'],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || currentUser.email?.split('@')[0] || 'المستخدم',
          admin: 'الدعم الفني المباشر',
        },
        isAiActive: true,
      });

      setConversations([newConv, ...conversations]);
      setActiveTypeTab('support_admin');
      setActiveConv(newConv);

      const welcome = await sendMessage(newConv.id, {
        conversationId: newConv.id,
        senderId: 'admin',
        senderName: 'مكتب الدعم الفني',
        senderRole: 'مشرف المنصة',
        text: 'أهلاً بك في الدعم الفني لمنصة خريطة المصانع! نحن هنا لمساعدتك في أي استفسار بخصوص تسجيل المصانع، مراجعة الحسابات، أو إدارة أوامر الشراء.',
        isAi: false,
      });

      setMessages([welcome]);
    } catch (e) {
      console.error('Error starting support chat:', e);
    }
  };

  // Start internal team chat for a factory
  const handleStartInternalTeamChat = async (factory: Factory) => {
    if (!currentUser) return;

    try {
      const newConv = await createConversation({
        type: 'internal_team',
        factoryId: factory.id,
        factoryName: factory.name,
        targetRole: 'team',
        participants: [currentUser.uid, factory.ownerId || 'team'],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'عضو الفريق',
        },
        isAiActive: false,
      });

      setConversations([newConv, ...conversations]);
      setActiveTypeTab('internal_team');
      setActiveConv(newConv);

      const welcome = await sendMessage(newConv.id, {
        conversationId: newConv.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'عضو الفريق',
        senderRole: 'فريق العمل الداخلي',
        text: `تم فتح قناة التواصل الداخلي لمصنع ${factory.name} لتنسيق العمل بين المبيعات، المشتريات، وإدارة المصنع.`,
        isAi: false,
      });

      setMessages([welcome]);
    } catch (e) {
      console.error('Error creating internal team chat:', e);
    }
  };

  // Send message and trigger AI auto-responder if enabled
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConv || !currentUser) return;

    const userText = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      // Resolve officer role based on matching email
      const userEmail = currentUser?.email?.toLowerCase().trim();
      const currentFactory = factories.find((f) => f.id === activeConv.factoryId);
      const isSalesForFactory = currentFactory?.salesOfficer?.email?.toLowerCase().trim() === userEmail;
      const isPurchasingForFactory = currentFactory?.purchasingOfficer?.email?.toLowerCase().trim() === userEmail;
      const isOwnerForFactory = currentFactory?.ownerEmail?.toLowerCase().trim() === userEmail || currentFactory?.ownerId === currentUser.uid;

      let senderRole = 'العميل المشتري';
      let isOfficerOrOwner = false;

      if (isSalesForFactory) {
        senderRole = `مسؤول المبيعات المعتمد (${currentFactory?.salesOfficer?.name || currentUser.displayName})`;
        isOfficerOrOwner = true;
      } else if (isPurchasingForFactory) {
        senderRole = `مسؤول المشتريات المعتمد (${currentFactory?.purchasingOfficer?.name || currentUser.displayName})`;
        isOfficerOrOwner = true;
      } else if (isOwnerForFactory) {
        senderRole = `إدارة المصنع (${currentFactory?.name})`;
        isOfficerOrOwner = true;
      } else if (isAdmin) {
        senderRole = 'مشرف المنصة';
      }

      // 1. Post user message
      const userMsg = await sendMessage(activeConv.id, {
        conversationId: activeConv.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || (isOfficerOrOwner ? 'مسؤول المصنع' : 'العميل'),
        senderRole,
        text: userText,
        isAi: false,
      });

      setMessages((prev) => [...prev, userMsg]);

      // 2. If message was sent by the officer/owner, do NOT trigger AI auto-responder (human is replying live!)
      if (isOfficerOrOwner) {
        setSending(false);
        return;
      }

      // 3. If it's a B2B chat with AI Auto-Responder enabled, trigger Gemini AI
      if (activeConv.type === 'b2b_factory' && aiEnabledForThisConv) {
        setIsAiThinking(true);
        const factory = factories.find((f) => f.id === activeConv.factoryId);

        // Format recent history
        const recentHistory = messages.slice(-5).map((m) => ({
          sender: m.isAi ? ('assistant' as const) : ('user' as const),
          text: m.text,
        }));

        try {
          const aiResponse = await askFactoryAutoResponder({
            factoryName: factory?.name || activeConv.factoryName || 'المصنع',
            factoryDescription: factory?.description,
            productsList: factory?.productsList,
            officerRole: (activeConv.targetRole as 'sales' | 'purchasing') || 'sales',
            systemPrompt: factory?.aiAutoResponderPrompt,
            chatHistory: recentHistory,
            userMessage: userText,
          });

          // Post AI response as message
          const aiMsg = await sendMessage(activeConv.id, {
            conversationId: activeConv.id,
            senderId: 'ai_assistant',
            senderName: `الرد الآلي للمبيعات - ${factory?.name || ''}`,
            senderRole: activeConv.targetRole === 'sales' ? 'مسؤول المبيعات' : 'مسؤول المشتريات',
            text: aiResponse.reply,
            isAi: true,
            orderProposal: aiResponse.orderProposal || undefined,
          });

          setMessages((prev) => [...prev, aiMsg]);
        } catch (aiErr) {
          console.error('AI responder error:', aiErr);
        } finally {
          setIsAiThinking(false);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Convert AI Order Proposal to Formal Purchase Order
  const handleConvertProposalToOrder = async (proposal: OrderProposal) => {
    if (!currentUser || !activeConv) return;

    const factory = factories.find((f) => f.id === activeConv.factoryId);
    if (!factory) return;

    try {
      const created = await createOrder({
        factoryId: factory.id,
        factoryName: factory.name,
        factoryOwnerId: factory.ownerId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'العميل',
        buyerEmail: currentUser.email || '',
        buyerPhone: currentUser.phoneNumber || '',
        title: proposal.title,
        quantity: proposal.quantity,
        unit: proposal.unit,
        targetPrice: proposal.estimatedPrice / (proposal.quantity || 1),
        totalAmount: proposal.estimatedPrice,
        currency: proposal.currency || 'EGP',
        notes: `تم إنشاء هذا الأمر تلقائياً عبر نظام المحادثات والرد الآلي الذكي. المواصفات: ${proposal.specifications}`,
        status: 'pending',
        source: 'ai_chat',
        conversationId: activeConv.id,
      });

      // Post confirmation inside chat
      await sendMessage(activeConv.id, {
        conversationId: activeConv.id,
        senderId: 'system',
        senderName: 'نظام إدارة العقود',
        senderRole: 'النظام',
        text: `🎉 تم تحويل المحادثة بنجاح إلى أمر شراء رسمي رقم (#${created.id.slice(-6)}) بقيمة ${created.totalAmount} ${created.currency}. يمكنك الآن متابعة مراحل التجهيز والتصنيع عبر لوحة الطلبات.`,
        isAi: false,
      });

      // Trigger callback
      onOrderCreatedFromChat(created.id);
    } catch (e) {
      console.error('Failed to convert order:', e);
    }
  };

  const filteredConversations = conversations.filter((c) => c.type === activeTypeTab);

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6 w-full h-[calc(100dvh-3.5rem-4.5rem)] md:h-[calc(100vh-4.5rem)] flex flex-col">
      
      {/* Top 3-in-1 Category Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-lg shrink-0">
        
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
          {/* Tab 1: B2B Client with Factory */}
          <button
            onClick={() => {
              setActiveTypeTab('b2b_factory');
              setActiveConv(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTypeTab === 'b2b_factory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>محادثات المصانع</span>
            <span className="text-[10px] bg-slate-900/40 px-1 py-0.2 rounded-full">
              {conversations.filter((c) => c.type === 'b2b_factory').length}
            </span>
          </button>

          {/* Tab 2: Internal Team Chat */}
          <button
            onClick={() => {
              setActiveTypeTab('internal_team');
              setActiveConv(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTypeTab === 'internal_team'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>فريق المصنع</span>
            <span className="text-[10px] bg-slate-900/40 px-1 py-0.2 rounded-full">
              {conversations.filter((c) => c.type === 'internal_team').length}
            </span>
          </button>

          {/* Tab 3: Admin Technical Support */}
          <button
            onClick={() => {
              setActiveTypeTab('support_admin');
              setActiveConv(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTypeTab === 'support_admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>الدعم الفني</span>
          </button>
        </div>

        {/* Quick action: start support chat or team chat */}
        {activeTypeTab === 'support_admin' ? (
          <button
            onClick={handleStartSupportChat}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 shadow-md shadow-emerald-600/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">دعم جديد</span>
          </button>
        ) : (
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">محادثة جديدة</span>
          </button>
        )}
      </div>

      {/* Main Chat Grid (Sidebar Conversations + Active Chat Window) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-hidden">
        
        {/* Sidebar: Conversations List (Visible on desktop or when no active chat on mobile) */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl`}>
          <div className="p-3 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300">
              قائمة المحادثات ({filteredConversations.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pb-16 md:pb-0">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد محادثات نشطة في هذا القسم حالياً.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 cursor-pointer transition-all active:bg-slate-800 ${
                      isSelected
                        ? 'bg-amber-500/10 border-r-4 border-amber-500'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {conv.factoryName || 'محادثة'}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate leading-snug">
                      {conv.lastMessage || 'بدء المحادثة'}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {conv.targetRole === 'sales'
                          ? 'المبيعات'
                          : conv.targetRole === 'purchasing'
                          ? 'المشتريات'
                          : conv.targetRole === 'support'
                          ? 'دعم الإدارة'
                          : 'الفريق'}
                      </span>
                      {conv.isAiActive && (
                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5 font-bold">
                          <Sparkles className="w-3 h-3" />
                          رد آلي
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Window (Visible on desktop or when active chat is selected on mobile) */}
        <div className={`${!activeConv ? 'hidden md:flex' : 'flex'} md:col-span-2 lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-2.5 sm:p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  {/* Mobile Back button */}
                  <button
                    onClick={() => setActiveConv(null)}
                    className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    title="الرجوع للقائمة"
                  >
                    ←
                  </button>

                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    {activeConv.type === 'support_admin' ? (
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    ) : (
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-base font-bold text-slate-100 truncate max-w-[170px] sm:max-w-none">
                      {activeConv.factoryName}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                      <span>{activeConv.targetRole === 'sales' ? 'المبيعات' : activeConv.targetRole === 'purchasing' ? 'المشتريات' : 'الدعم'}</span>
                      {activeConv.isAiActive && (
                        <span className="text-emerald-400 font-semibold">
                          • الرد الآلي نشط
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* AI Toggle inside Chat if B2B */}
                {activeConv.type === 'b2b_factory' && (
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] text-slate-300 hidden sm:inline font-medium">الرد الآلي:</span>
                    <button
                      onClick={() => setAiEnabledForThisConv(!aiEnabledForThisConv)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                        aiEnabledForThisConv
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {aiEnabledForThisConv ? 'مفعّل' : 'معطل'}
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/60">
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.uid;
                  const isAi = msg.isAi;
                  const isSystem = msg.senderId === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-3">
                        <span className="inline-block bg-slate-800/90 text-amber-300 text-xs px-4 py-1.5 rounded-full border border-amber-500/20">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-400">
                          {msg.senderName}
                        </span>
                        {isAi && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded-full font-bold">
                            ذكاء اصطناعي
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600">
                          {new Date(msg.createdAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          isMine
                            ? 'bg-amber-500 text-slate-950 font-medium rounded-tl-sm shadow-md shadow-amber-500/10'
                            : isAi
                            ? 'bg-slate-800 text-slate-100 border border-blue-500/30 rounded-tr-sm shadow-lg'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tr-sm shadow-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Interactive Order Proposal Card from AI Auto-Responder */}
                        {msg.orderProposal && (
                          <div className="mt-3 pt-3 border-t border-slate-700/80 bg-slate-900/90 p-3 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                اقتراح أمر شراء رسمي فوري
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                {msg.orderProposal.estimatedPrice} {msg.orderProposal.currency}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-200">
                              {msg.orderProposal.title}
                            </p>

                            <div className="text-[11px] text-slate-400 space-y-0.5">
                              <div>الكمية: {msg.orderProposal.quantity} {msg.orderProposal.unit}</div>
                              <div>المواصفات: {msg.orderProposal.specifications}</div>
                            </div>

                            <button
                              onClick={() => handleConvertProposalToOrder(msg.orderProposal!)}
                              className="w-full mt-2 py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              تحويل المحادثة إلى أمر شراء رسمي وتتبعه 🚀
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* AI Thinking Animation */}
                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs text-blue-400 bg-slate-900/60 p-2.5 rounded-xl w-fit border border-blue-500/20">
                    <Sparkles className="w-4 h-4 animate-spin text-blue-400" />
                    <span>روبوت المبيعات يقوم بصياغة الرد وتحليل متطلبات الطلب...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={
                    activeConv.type === 'b2b_factory'
                      ? 'اكتب رسالتك للمصنع (مثال: نحتاج تسعير 1000 كرتونة، أو مواصفات التوريد)...'
                      : 'اكتب رسالتك هنا...'
                  }
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm bg-slate-800 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />

                <button
                  type="submit"
                  disabled={sending || !newMessageText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">إرسال</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <MessageSquare className="w-16 h-16 text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-300">اختر محادثة لبدء المراسلة</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                يمكنك بدء محادثة فورية مع مسؤولي المبيعات والمشتريات بالمصانع، أو التواصل المباشر مع الدعم الفني للإدارة.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal (Pick factory and role) */}
      {showNewChatModal && (
        <ModalShell id="new-chat" open={showNewChatModal} onClose={() => setShowNewChatModal(false)} rootClassName="p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">بدء محادثة جديدة</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اختر المصنع المراد مراسلته:
              </label>
              <select
                onChange={(e) => {
                  const fac = factories.find((f) => f.id === e.target.value);
                  setSelectedFactoryForNewChat(fac || null);
                }}
                className="w-full py-2 px-3 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-200"
              >
                <option value="">-- حدد المصنع --</option>
                {factories.filter((f) => f.status === 'approved').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الجهة المستهدفة:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRoleForNewChat('sales')}
                  className={`p-2.5 rounded-xl border text-center font-bold ${
                    selectedRoleForNewChat === 'sales'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  مسؤول المبيعات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleForNewChat('purchasing')}
                  className={`p-2.5 rounded-xl border text-center font-bold ${
                    selectedRoleForNewChat === 'purchasing'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  مسؤول المشتريات
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 text-xs bg-slate-800 rounded-xl text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedFactoryForNewChat}
                onClick={() => {
                  if (selectedFactoryForNewChat) {
                    handleInitiateChat(selectedFactoryForNewChat, selectedRoleForNewChat);
                    setShowNewChatModal(false);
                  }
                }}
                className="px-5 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl disabled:opacity-40"
              >
                بدء المحادثة
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
