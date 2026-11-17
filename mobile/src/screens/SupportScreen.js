import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  Headphones,
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Clock,
  MapPin,
  Bot,
  User,
  ShieldCheck,
  Building,
  Home,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { EMERGENCY_HELPLINE } from '../config/api';

const MOCK_BOT_RESPONSES = {
  rain: '🌧️ **Fungicide & Rain:** Never spray fungicides if rain is expected within 3 hours. Rain washes away active foliar barriers. Wait for leaves to dry completely before applying protective sprays.',
  dilution: '🧪 **Standard Dilution:** For Copper Oxychloride (50% WP), mix 2.5 grams to 3.0 grams per 1 Liter of water. For home gardeners using Neem oil, mix 5 ml Neem oil + 2 ml mild liquid soap per 1 Liter water.',
  isolation: '✂️ **Sanitary Quarantine:** If more than 50% of the plant is engulfed in black Late Blight or Bacterial cankers, immediately bag the entire plant and dispose of it away from the compost heap. Sterilize pruning shears with 70% alcohol.',
  safety: '🍅 **Harvest Safety:** Always observe the Pre-Harvest Interval (PHI) on chemical labels. For copper sprays, wait at least 3-5 days and wash all produce thoroughly under running water before cooking.',
};

export default function SupportScreen({ navigation }) {
  const {
    latestDiagnosis,
    currentLocation,
    weatherData,
    persona,
    setPersona,
    tickets,
    addTicket,
  } = useApp();

  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketNotes, setTicketNotes] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am Dr. AgriBot, your virtual crop pathologist. How can I assist your crop protection today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Native phone call to Kisan Agricultural Helpline
  const handleCallHelpline = () => {
    const phoneUrl = `tel:${EMERGENCY_HELPLINE}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert(
            'Toll-Free Helpline',
            `Agricultural Extension Helpline: ${EMERGENCY_HELPLINE}\n(Please dial from your phone).`
          );
        } else {
          Linking.openURL(phoneUrl);
        }
      })
      .catch(() => {
        Alert.alert('Phone Helpline', `Please dial: ${EMERGENCY_HELPLINE}`);
      });
  };

  // Submit emergency ticket
  const handleCreateTicket = () => {
    if (!latestDiagnosis) {
      Alert.alert(
        'No Diagnosis Available',
        'Please scan leaves in the Scanner tab first so your diagnosis data can be attached to the triage ticket.'
      );
      return;
    }

    const ticketNumber = Math.floor(1000 + Math.random() * 9000);
    const newTicket = {
      id: `AGRI-2026-${ticketNumber}`,
      date: 'Just now',
      disease: `${latestDiagnosis.plant} ${latestDiagnosis.condition}`,
      severity: latestDiagnosis.is_healthy ? 'Normal' : 'Critical',
      status: 'In Review by Pathologist',
      urgency: latestDiagnosis.is_healthy ? 'Standard' : 'High',
      crop: latestDiagnosis.plant,
      location: currentLocation?.label || 'GPS Field Coordinate',
      notes: ticketNotes.trim() || 'Urgent foliar disease triage requested.',
    };

    addTicket(newTicket);
    setTicketNotes('');
    setShowNewTicketModal(false);

    Alert.alert(
      'Case Ticket Submitted',
      `Ticket #${newTicket.id} has been dispatched to the Agricultural Extension District Officer. Expected review: 1-2 hours.`
    );
  };

  // Chat message send
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMsg = { id: Date.now(), sender: 'user', text: userText };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Generate intelligent dummy agronomist response
    setTimeout(() => {
      let botReply =
        'Thank you for reporting this foliar symptom. Based on standard agronomic extension protocols, ensure morning drip irrigation and monitor leaf undersides closely. A senior district officer will review your case.';
      const lower = userText.toLowerCase();

      if (lower.includes('rain') || lower.includes('wash') || lower.includes('weather')) {
        botReply = MOCK_BOT_RESPONSES.rain;
      } else if (lower.includes('dilute') || lower.includes('dose') || lower.includes('spray') || lower.includes('ratio')) {
        botReply = MOCK_BOT_RESPONSES.dilution;
      } else if (lower.includes('isolate') || lower.includes('cut') || lower.includes('prune') || lower.includes('uproot')) {
        botReply = MOCK_BOT_RESPONSES.isolation;
      } else if (lower.includes('eat') || lower.includes('food') || lower.includes('safe') || lower.includes('harvest')) {
        botReply = MOCK_BOT_RESPONSES.safety;
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: botReply },
      ]);
    }, 600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>🧑‍🌾</Text>
          <View>
            <Text style={styles.title}>Agronomist Support</Text>
            <Text style={styles.subtitle}>Emergency Extension & Kisan Help Desk</Text>
          </View>
        </View>
      </View>

      {/* Persona Switcher: Farmer vs Gardener */}
      <View style={styles.personaContainer}>
        <TouchableOpacity
          style={[
            styles.personaBtn,
            persona === 'farmer' && styles.personaBtnActive,
          ]}
          onPress={() => setPersona('farmer')}
        >
          <Building size={16} color={persona === 'farmer' ? '#ffffff' : '#475569'} />
          <Text
            style={[
              styles.personaText,
              persona === 'farmer' && styles.personaTextActive,
            ]}
          >
            🌾 Commercial Farmer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.personaBtn,
            persona === 'gardener' && styles.personaBtnActive,
          ]}
          onPress={() => setPersona('gardener')}
        >
          <Home size={16} color={persona === 'gardener' ? '#ffffff' : '#475569'} />
          <Text
            style={[
              styles.personaText,
              persona === 'gardener' && styles.personaTextActive,
            ]}
          >
            🏡 Home Gardener
          </Text>
        </TouchableOpacity>
      </View>

      {/* Critical Case Alert Banner (if latest diagnosis is critical) */}
      {latestDiagnosis && !latestDiagnosis.is_healthy && (
        <View style={styles.criticalBanner}>
          <View style={styles.criticalHeader}>
            <AlertTriangle size={20} color="#dc2626" />
            <Text style={styles.criticalTitle}>
              CRITICAL OUTBREAK DETECTED
            </Text>
          </View>
          <Text style={styles.criticalSub}>
            Diagnosed: <Text style={{ fontWeight: '800' }}>{latestDiagnosis.plant} — {latestDiagnosis.condition}</Text>
          </Text>
          <Text style={styles.criticalDesc}>
            {persona === 'farmer'
              ? 'This pathogen exhibits rapid field-scale spread. Immediate spray schedule and extension officer triage are highly recommended to prevent yield collapse.'
              : 'This foliar infection can kill potted container plants quickly. Prune heavily infected leaves immediately and isolate from adjacent balcony plants.'}
          </Text>
          <View style={styles.criticalBtnRow}>
            <TouchableOpacity
              style={styles.dispatchTicketBtn}
              onPress={() => setShowNewTicketModal(true)}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.dispatchTicketText}>Dispatch Case Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callHelplineBtn}
              onPress={handleCallHelpline}
            >
              <PhoneCall size={16} color="#065f46" />
              <Text style={styles.callHelplineText}>Call 1800-180-1551</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Contact Cards */}
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactCard} onPress={handleCallHelpline}>
          <View style={styles.contactIconBgGreen}>
            <PhoneCall size={22} color="#047857" />
          </View>
          <Text style={styles.contactCardTitle}>Toll-Free Helpline</Text>
          <Text style={styles.contactCardSub}>1800-180-1551 (Kisan Center)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => setShowNewTicketModal(true)}
        >
          <View style={styles.contactIconBgBlue}>
            <Plus size={22} color="#0284c7" />
          </View>
          <Text style={styles.contactCardTitle}>Submit Case Ticket</Text>
          <Text style={styles.contactCardSub}>Attach 3 Leaf Photos & GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated Live Chat Assistant: Dr. AgriBot */}
      <View style={styles.chatSection}>
        <View style={styles.chatHeader}>
          <Bot size={18} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.chatTitle}>Ask Dr. AgriBot (Instant Agronomy AI)</Text>
            <Text style={styles.chatSubtitle}>Ask about spray timing, dilution, or quarantine</Text>
          </View>
        </View>

        {/* Quick Suggestion Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setChatInput('Can I spray fungicide before it rains?')}
          >
            <Text style={styles.chipText}>🌧️ Spraying before rain?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setChatInput('What is the copper spray dilution ratio?')}
          >
            <Text style={styles.chipText}>🧪 Copper dilution dosage?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setChatInput('Should I uproot or prune infected leaves?')}
          >
            <Text style={styles.chipText}>✂️ Uproot vs Prune?</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Message Log */}
        <View style={styles.chatBox}>
          {chatMessages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.messageUserRow : styles.messageBotRow,
              ]}
            >
              {msg.sender === 'bot' && (
                <View style={styles.botAvatar}>
                  <Bot size={14} color="#ffffff" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.sender === 'user' ? styles.messageUserBubble : styles.messageBotBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'user' && styles.messageUserText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Chat Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type your crop question here..."
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket Tracker History */}
      <View style={styles.ticketsSection}>
        <View style={styles.ticketsHeader}>
          <Clock size={18} color="#0f172a" />
          <Text style={styles.ticketsTitle}>Active Case Tickets ({tickets.length})</Text>
        </View>

        {tickets.map((t) => (
          <View key={t.id} style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <Text style={styles.ticketId}>{t.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  t.status === 'Prescription Issued'
                    ? styles.statusIssued
                    : styles.statusReview,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    t.status === 'Prescription Issued'
                      ? styles.statusIssuedText
                      : styles.statusReviewText,
                  ]}
                >
                  {t.status}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketDisease}>{t.disease}</Text>
            <Text style={styles.ticketNotes}>{t.notes}</Text>
            <View style={styles.ticketFooter}>
              <View style={styles.ticketMeta}>
                <MapPin size={12} color="#64748b" />
                <Text style={styles.ticketMetaText}>{t.location}</Text>
              </View>
              <Text style={styles.ticketTime}>{t.date}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Modal: Create Emergency Ticket */}
      <Modal visible={showNewTicketModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dispatch Case to Agronomist</Text>
            <Text style={styles.modalSubtitle}>
              Your 3 leaf photographs, GPS coordinates, and weather readings will be automatically attached.
            </Text>

            {latestDiagnosis && (
              <View style={styles.modalDiagBox}>
                <Text style={styles.modalDiagLabel}>Attached Diagnosis:</Text>
                <Text style={styles.modalDiagValue}>
                  {latestDiagnosis.plant} — {latestDiagnosis.condition} ({(latestDiagnosis.confidence * 100).toFixed(1)}%)
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Describe Field Observation / Urgency:</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="e.g. Water-soaked spots spreading fast after 2 days of rain. What fungicide is best?"
              value={ticketNotes}
              onChangeText={setTicketNotes}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowNewTicketModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateTicket}
              >
                <Text style={styles.modalSubmitText}>Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064e3b',
  },
  subtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  personaContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  personaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  personaBtnActive: {
    backgroundColor: '#059669',
  },
  personaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  personaTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  criticalBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  criticalTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  criticalSub: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 6,
  },
  criticalDesc: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
    marginBottom: 12,
  },
  criticalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dispatchTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  dispatchTicketText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  callHelplineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#065f46',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callHelplineText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 12,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    elevation: 1,
  },
  contactIconBgGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactIconBgBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  contactCardSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  chatSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  chatBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    minHeight: 140,
    maxHeight: 260,
    gap: 8,
    marginBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageBotRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 10,
  },
  messageUserBubble: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 2,
  },
  messageBotBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 12,
    color: '#1e293b',
    lineHeight: 17,
  },
  messageUserText: {
    color: '#ffffff',
  },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#059669',
    width: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketsSection: {
    gap: 10,
  },
  ticketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  ticketsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusReview: {
    backgroundColor: '#fef3c7',
  },
  statusReviewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  statusIssued: {
    backgroundColor: '#dcfce7',
  },
  statusIssuedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  ticketDisease: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  ticketNotes: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  ticketTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 16,
  },
  modalDiagBox: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  modalDiagLabel: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '600',
  },
  modalDiagValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064e3b',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  modalTextarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    height: 80,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  modalSubmitText: {
    fontWeight: '700',
    color: '#ffffff',
  },
});
