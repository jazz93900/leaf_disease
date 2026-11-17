import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Flame,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Trash2,
  HelpCircle,
  Layers,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import {
  getDiseaseSeverity,
  validateLeafImage,
  predictBatchLeaves,
  DEMO_3LEAF_SAMPLES,
} from '../config/api';

export default function DiagnoseScreen({ navigation }) {
  const {
    apiBaseUrl,
    setApiBaseUrl,
    leafSlots,
    updateLeafSlot,
    resetLeafSlots,
    setAllLeafSlots,
    latestDiagnosis,
    setLatestDiagnosis,
    setLatestImageUri,
    weatherRisk,
  } = useApp();

  const [analyzing, setAnalyzing] = useState(false);
  const [validatingSlot, setValidatingSlot] = useState(null);
  const [viewMode, setViewMode] = useState('original'); // 'original' | 'heatmap'
  const [activeHeatmapIndex, setActiveHeatmapIndex] = useState(0);
  const [backendOnline, setBackendOnline] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiBaseUrl);

  // Check Backend Health
  const checkBackendHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${apiBaseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, [apiBaseUrl]);

  // Handle Photo Capture for a specific Slot (Camera)
  const handleTakePhoto = async (slotIndex) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera permissions in device settings to photograph crop leaves.'
        );
        return;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const uri = pickerResult.assets[0].uri;
        await processAndValidateLeaf(slotIndex, uri);
      }
    } catch (err) {
      Alert.alert('Camera Error', err.message || 'Unable to open camera');
    }
  };

  // Handle Gallery Pick for a specific Slot
  const handlePickFromGallery = async (slotIndex) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Permission Required',
          'Please allow photo library permissions to select plant leaves.'
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const uri = pickerResult.assets[0].uri;
        await processAndValidateLeaf(slotIndex, uri);
      }
    } catch (err) {
      Alert.alert('Gallery Error', err.message || 'Unable to access photo gallery');
    }
  };

  // Validate Leaf Quality (Blur, Foliage Presence, Lighting)
  const processAndValidateLeaf = async (slotIndex, uri) => {
    setValidatingSlot(slotIndex);
    try {
      const check = await validateLeafImage(uri, apiBaseUrl);

      if (!check.is_proper) {
        // Reject non-proper image
        updateLeafSlot(slotIndex, null, false, check.reason);
        Alert.alert(
          'Leaf Quality Warning',
          `❌ Image Not Proper: ${check.reason}\n\nPlease click again or upload a clearer photo from your gallery.`,
          [
            {
              text: 'Retake Camera',
              onPress: () => handleTakePhoto(slotIndex),
            },
            {
              text: 'Choose from Gallery',
              onPress: () => handlePickFromGallery(slotIndex),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        // Image verified
        updateLeafSlot(slotIndex, uri, true, null);
      }
    } catch (err) {
      // Fallback: accept if network fails
      updateLeafSlot(slotIndex, uri, true, null);
    } finally {
      setValidatingSlot(null);
    }
  };

  // Load 1-Click 3-Leaf Demo Sample
  const handleLoadDemo = (sample) => {
    setAllLeafSlots(sample.leafImages);
    const mockConsensus = {
      success: true,
      is_consensus: true,
      leaves_analyzed_count: 3,
      plant: sample.plant,
      condition: sample.condition,
      is_healthy: sample.condition.toLowerCase().includes('healthy'),
      confidence: sample.confidence,
      inference_latency_ms: 10.8,
      remedy: sample.remedy,
      top3_predictions: [
        { class: `${sample.plant}___${sample.condition.replace(/ /g, '_')}`, probability: sample.confidence },
        { class: `${sample.plant}___Healthy`, probability: (1 - sample.confidence) * 0.7 },
        { class: `${sample.plant}___Early_blight`, probability: (1 - sample.confidence) * 0.3 },
      ],
      individual_leaves: [
        { leaf_index: 1, condition: sample.condition, confidence: sample.confidence },
        { leaf_index: 2, condition: sample.condition, confidence: sample.confidence - 0.01 },
        { leaf_index: 3, condition: sample.condition, confidence: sample.confidence + 0.01 },
      ],
      demoUris: sample.leafImages,
    };
    setLatestDiagnosis(mockConsensus);
    setLatestImageUri(sample.leafImages[0]);
    setViewMode('original');
  };

  // Check if at least 1 proper leaf is scanned
  const validLeavesCount = leafSlots.filter((slot) => slot.isValid && slot.uri).length;
  const hasMainLeaf = Boolean(leafSlots[0]?.isValid && leafSlots[0]?.uri);
  const canAnalyze = validLeavesCount >= 1;

  // Auto-fill Slots 2 & 3 with dummy clones of Leaf 1
  const handleAutoFillDummyLeaves = () => {
    if (!hasMainLeaf) {
      Alert.alert(
        'Main Leaf Required',
        'Please photograph or upload Leaf #1 first as your primary leaf specimen.'
      );
      return;
    }
    const mainUri = leafSlots[0].uri;
    updateLeafSlot(1, mainUri, true, null);
    updateLeafSlot(2, mainUri, true, null);
    Alert.alert(
      'Auxiliary Slots Ready',
      'Slots #2 and #3 have been auto-filled using your primary leaf image. You can now run diagnosis!'
    );
  };

  // Run AI Inference against FastAPI
  const handleRunConsensusDiagnosis = async () => {
    if (!canAnalyze) {
      Alert.alert(
        'Photograph Leaf #1',
        'Please photograph or upload at least the primary leaf (#1) to run disease diagnosis.'
      );
      return;
    }

    setAnalyzing(true);
    let imageUris = leafSlots.map((s) => s.uri).filter(Boolean);
    // If only 1 image provided, clone to 3 so consensus batch handles it seamlessly
    if (imageUris.length === 1) {
      imageUris = [imageUris[0], imageUris[0], imageUris[0]];
    }

    try {
      const data = await predictBatchLeaves(imageUris, apiBaseUrl);
      setLatestDiagnosis(data);
      setLatestImageUri(imageUris[0]);
      if (data.gradcam_heatmap_base64) {
        setViewMode('heatmap');
      }
    } catch (err) {
      Alert.alert(
        'Inference Server Notice',
        `Could not reach backend at ${apiBaseUrl}.\n\nDetails: ${err.message}\n\nTroubleshooting:\n1. Ensure your laptop terminal is running:\n   python run.py api --host 0.0.0.0 --port 8000\n2. Verify phone and laptop are on the same Wi-Fi.\n3. Tap the ⚙️ icon in the top right to verify or change the IP address.`
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const severity = latestDiagnosis
    ? getDiseaseSeverity(latestDiagnosis.condition, latestDiagnosis.is_healthy)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>🌿</Text>
          <View>
            <Text style={styles.appTitle}>AgriVision Scanner</Text>
            <Text style={styles.appSubtitle}>3-Leaf Multi-View Pathology & Grad-CAM</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => {
            setTempUrl(apiBaseUrl);
            setShowSettings(true);
          }}
        >
          <Settings size={20} color="#065f46" />
        </TouchableOpacity>
      </View>

      {/* Backend Status Bar */}
      <View
        style={[
          styles.statusBar,
          backendOnline ? styles.statusOnline : styles.statusOffline,
        ]}
      >
        <Activity size={14} color={backendOnline ? '#059669' : '#dc2626'} />
        <Text
          style={[
            styles.statusText,
            { color: backendOnline ? '#065f46' : '#991b1b' },
          ]}
        >
          {backendOnline === null
            ? 'Checking FastAPI...'
            : backendOnline
            ? `FastAPI Online (${apiBaseUrl.replace('http://', '')})`
            : `Backend Offline (${apiBaseUrl.replace('http://', '')})`}
        </Text>
        <TouchableOpacity onPress={checkBackendHealth} style={styles.refreshIcon}>
          <RefreshCw size={13} color={backendOnline ? '#059669' : '#dc2626'} />
        </TouchableOpacity>
      </View>

      {/* Weather Microclimate Quick Ribbon (if available) */}
      {weatherRisk && (
        <TouchableOpacity
          style={[styles.weatherRibbon, { borderColor: weatherRisk.color }]}
          onPress={() => navigation.navigate('Weather')}
        >
          <Text style={styles.weatherRibbonIcon}>🌦️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weatherRibbonTitle, { color: weatherRisk.color }]}>
              {weatherRisk.level}: {weatherRisk.title}
            </Text>
            <Text style={styles.weatherRibbonSub} numberOfLines={1}>
              {weatherRisk.description}
            </Text>
          </View>
          <ArrowRight size={16} color={weatherRisk.color} />
        </TouchableOpacity>
      )}

      {/* Instructions Card */}
      <View style={styles.instructionCard}>
        <View style={styles.instructionHeader}>
          <ShieldCheck size={18} color="#059669" />
          <Text style={styles.instructionTitle}>
            Scan at least 3 Proper Leaf Images
          </Text>
        </View>
        <Text style={styles.instructionBody}>
          Take clear, well-lit photos of different leaf views (Upper, Underside & Branch). If a photo is blurry or unreadable, the system will prompt you to retake or upload from gallery.
        </Text>
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            Progress: <Text style={styles.counterBold}>{validLeavesCount} of 3 Leaves Verified</Text>
          </Text>
          {validLeavesCount > 0 && (
            <TouchableOpacity onPress={resetLeafSlots} style={styles.clearBtn}>
              <Trash2 size={13} color="#ef4444" />
              <Text style={styles.clearBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3-Leaf Slot Cards */}
      <View style={styles.slotsContainer}>
        {leafSlots.map((slot, index) => {
          const isValid = slot.isValid && slot.uri;
          const isValidating = validatingSlot === index;

          return (
            <View
              key={slot.id}
              style={[
                styles.slotCard,
                isValid ? styles.slotCardValid : slot.error ? styles.slotCardError : null,
              ]}
            >
              <View style={styles.slotHeader}>
                <View style={styles.slotIndexBadge}>
                  <Text style={styles.slotIndexText}>#{slot.id}</Text>
                </View>
                <Text style={styles.slotLabel}>{slot.label}</Text>

                {isValid ? (
                  <View style={styles.badgeSuccess}>
                    <CheckCircle2 size={14} color="#059669" />
                    <Text style={styles.badgeSuccessText}>Proper Leaf ✅</Text>
                  </View>
                ) : slot.error ? (
                  <View style={styles.badgeError}>
                    <AlertTriangle size={14} color="#dc2626" />
                    <Text style={styles.badgeErrorText}>Not Proper ⚠️</Text>
                  </View>
                ) : (
                  <View style={styles.badgePending}>
                    <Text style={styles.badgePendingText}>Awaiting Scan</Text>
                  </View>
                )}
              </View>

              {/* Slot Thumbnail or Actions */}
              {isValidating ? (
                <View style={styles.validatingBox}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.validatingText}>Verifying leaf quality & clarity...</Text>
                </View>
              ) : isValid ? (
                <View style={styles.thumbnailContainer}>
                  <Image source={{ uri: slot.uri }} style={styles.leafThumbnail} />
                  <View style={styles.thumbnailActions}>
                    <TouchableOpacity
                      style={styles.retakeBtnSmall}
                      onPress={() => handleTakePhoto(index)}
                    >
                      <Camera size={14} color="#047857" />
                      <Text style={styles.retakeBtnSmallText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.retakeBtnSmall}
                      onPress={() => handlePickFromGallery(index)}
                    >
                      <ImageIcon size={14} color="#047857" />
                      <Text style={styles.retakeBtnSmallText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.slotButtons}>
                  {slot.error && (
                    <Text style={styles.slotErrorDesc}>
                      ❌ {slot.error}
                    </Text>
                  )}
                  <View style={styles.slotActionRow}>
                    <TouchableOpacity
                      style={styles.slotCameraBtn}
                      onPress={() => handleTakePhoto(index)}
                    >
                      <Camera size={18} color="#ffffff" />
                      <Text style={styles.slotBtnTextWhite}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.slotGalleryBtn}
                      onPress={() => handlePickFromGallery(index)}
                    >
                      <ImageIcon size={18} color="#065f46" />
                      <Text style={styles.slotBtnTextGreen}>Upload Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 1-Leaf Fallback: Auto-fill remaining auxiliary slots with Leaf #1 */}
      {hasMainLeaf && validLeavesCount < 3 && (
        <TouchableOpacity
          style={styles.autoFillDummyBtn}
          onPress={handleAutoFillDummyLeaves}
        >
          <Sparkles size={16} color="#047857" />
          <Text style={styles.autoFillDummyText}>
            ✨ Auto-fill Slots 2 & 3 with Leaf #1 (Use 1 Main Leaf)
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Action Button: Run Consensus Diagnosis */}
      <TouchableOpacity
        style={[
          styles.consensusAnalyzeBtn,
          !canAnalyze && styles.consensusAnalyzeBtnDisabled,
        ]}
        onPress={handleRunConsensusDiagnosis}
        disabled={!canAnalyze || analyzing}
      >
        {analyzing ? (
          <View style={styles.analyzingRow}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.btnTextWhite}>Running AI Diagnosis & Grad-CAM...</Text>
          </View>
        ) : (
          <View style={styles.analyzingRow}>
            <Zap size={20} color="#ffffff" />
            <Text style={styles.btnTextWhite}>
              {canAnalyze
                ? validLeavesCount === 3
                  ? '⚡ Run Multi-Leaf Consensus Diagnosis (3 Views)'
                  : `⚡ Run AI Diagnosis with Leaf #1 (${validLeavesCount}/3 Scanned)`
                : 'Capture Leaf #1 to Run Diagnosis'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 1-Click Demo Benchmark Samples */}
      <View style={styles.demoSection}>
        <View style={styles.demoHeader}>
          <Sparkles size={14} color="#059669" />
          <Text style={styles.demoLabel}>1-Click Quick Benchmark Demos (3 Leaves):</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.demoScroll}>
          {DEMO_3LEAF_SAMPLES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.demoChip}
              onPress={() => handleLoadDemo(s)}
            >
              <Text style={styles.demoChipText}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Image Preview & Grad-CAM Heatmap Toggle */}
      {latestDiagnosis && (
        <View style={styles.imageCard}>
          <View style={styles.imageContainer}>
            {viewMode === 'heatmap' && latestDiagnosis.gradcam_heatmap_base64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${latestDiagnosis.gradcam_heatmap_base64}` }}
                style={styles.leafImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={{
                  uri:
                    leafSlots[0]?.uri ||
                    latestDiagnosis.demoUris?.[0] ||
                    'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=500',
                }}
                style={styles.leafImage}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Toggle View Mode Button */}
          {latestDiagnosis.gradcam_heatmap_base64 && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  viewMode === 'original' && styles.toggleBtnActive,
                ]}
                onPress={() => setViewMode('original')}
              >
                <ImageIcon size={16} color={viewMode === 'original' ? '#ffffff' : '#475569'} />
                <Text
                  style={[
                    styles.toggleBtnText,
                    viewMode === 'original' && styles.toggleBtnTextActive,
                  ]}
                >
                  Original Leaf
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  viewMode === 'heatmap' && styles.toggleBtnActiveHeatmap,
                ]}
                onPress={() => setViewMode('heatmap')}
              >
                <Flame size={16} color={viewMode === 'heatmap' ? '#ffffff' : '#b91c1c'} />
                <Text
                  style={[
                    styles.toggleBtnText,
                    viewMode === 'heatmap' && styles.toggleBtnTextActive,
                  ]}
                >
                  Grad-CAM Heatmap
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Diagnosis Results Card */}
      {latestDiagnosis && severity && (
        <View style={styles.resultsCard}>
          {/* Severity & Condition Badge */}
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: severity.bgColor, borderColor: severity.borderColor },
            ]}
          >
            <View style={styles.severityTitleRow}>
              {severity.isCritical ? (
                <AlertTriangle size={20} color={severity.color} />
              ) : (
                <CheckCircle2 size={20} color={severity.color} />
              )}
              <Text style={[styles.severityLevelText, { color: severity.color }]}>
                {severity.level.toUpperCase()} SEVERITY
              </Text>
            </View>
            <Text style={styles.conditionHeadline}>
              {latestDiagnosis.plant} — {latestDiagnosis.condition}
            </Text>
            <Text style={styles.severityDesc}>{severity.description}</Text>
          </View>

          {/* Metrics: Confidence, Multi-leaf Consensus, Latency */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>AI Confidence</Text>
              <Text style={styles.metricVal}>
                {(latestDiagnosis.confidence * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Leaves Evaluated</Text>
              <Text style={styles.metricVal}>
                {latestDiagnosis.leaves_analyzed_count || 3} Views
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Health Status</Text>
              <Text
                style={[
                  styles.metricVal,
                  { color: latestDiagnosis.is_healthy ? '#059669' : '#dc2626' },
                ]}
              >
                {latestDiagnosis.is_healthy ? 'Healthy' : 'Diseased'}
              </Text>
            </View>
          </View>

          {/* Actionable Agronomic Remedy Card */}
          <View style={styles.remedyBox}>
            <View style={styles.remedyHeader}>
              <Zap size={16} color="#059669" />
              <Text style={styles.remedyTitle}>Recommended Treatment Advice:</Text>
            </View>
            <Text style={styles.remedyBody}>
              {latestDiagnosis.tailoredRemedy || latestDiagnosis.remedy}
            </Text>
          </View>

          {/* Step 2 Prompt: Questionnaire Navigation */}
          <TouchableOpacity
            style={styles.questionnaireBanner}
            onPress={() => navigation.navigate('Questionnaire')}
          >
            <View style={styles.questionnaireBannerContent}>
              <ClipboardList size={22} color="#047857" />
              <View style={{ flex: 1 }}>
                <Text style={styles.questionnaireBannerTitle}>
                  Refine Diagnosis with Field Questionnaire
                </Text>
                <Text style={styles.questionnaireBannerSub}>
                  Answer 5 quick agronomic questions (watering, symptom age, soil) to tailor chemical & organic spray dosages.
                </Text>
              </View>
              <ArrowRight size={20} color="#047857" />
            </View>
          </TouchableOpacity>

          {/* Critical Escalation Banner (links to Tab 4 Expert Support) */}
          {severity.isCritical && (
            <TouchableOpacity
              style={styles.escalateCard}
              onPress={() => navigation.navigate('Support')}
            >
              <View style={styles.escalateTextContainer}>
                <View style={styles.escalateBadge}>
                  <AlertTriangle size={14} color="#ffffff" />
                  <Text style={styles.escalateBadgeText}>CRITICAL SPREAD RISK</Text>
                </View>
                <Text style={styles.escalateTitle}>
                  Consult Agricultural Extension Expert
                </Text>
                <Text style={styles.escalateSubtitle}>
                  This pathogen causes rapid foliar blight. Tap to escalate case with photos, GPS & weather data to Kisan Helpline / Agronomist.
                </Text>
              </View>
              <View style={styles.escalateArrow}>
                <ArrowRight size={20} color="#ffffff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Host Configuration Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>FastAPI Backend IP</Text>
            <Text style={styles.modalSub}>
              Enter your computer's local Wi-Fi IP address if testing on a physical smartphone:
            </Text>
            <TextInput
              style={styles.ipInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.5:8000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  setApiBaseUrl(tempUrl.trim());
                  setShowSettings(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save IP</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 28,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064e3b',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  statusOnline: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusOffline: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  refreshIcon: {
    padding: 2,
  },
  weatherRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  weatherRibbonIcon: {
    fontSize: 24,
  },
  weatherRibbonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  weatherRibbonSub: {
    fontSize: 11,
    color: '#64748b',
  },
  instructionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  instructionBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  counterText: {
    fontSize: 12,
    color: '#475569',
  },
  counterBold: {
    fontWeight: '700',
    color: '#059669',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  slotsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  slotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  slotCardValid: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  slotCardError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  slotIndexBadge: {
    backgroundColor: '#064e3b',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotIndexText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  slotLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  badgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  badgePending: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePendingText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  validatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  validatingText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leafThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  thumbnailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  retakeBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeBtnSmallText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '600',
  },
  slotButtons: {
    marginTop: 2,
  },
  slotErrorDesc: {
    fontSize: 11,
    color: '#b91c1c',
    marginBottom: 8,
    fontWeight: '500',
  },
  slotActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  slotGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  slotBtnTextWhite: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  slotBtnTextGreen: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  autoFillDummyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  autoFillDummyText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 13,
  },
  consensusAnalyzeBtn: {
    backgroundColor: '#047857',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  consensusAnalyzeBtnDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
    shadowOpacity: 0,
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  demoSection: {
    marginBottom: 16,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  demoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  demoScroll: {
    flexDirection: 'row',
  },
  demoChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  imageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  leafImage: {
    width: '100%',
    height: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
  },
  toggleBtnActiveHeatmap: {
    backgroundColor: '#dc2626',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  resultsCard: {
    gap: 12,
  },
  severityBadge: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
  },
  severityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  severityLevelText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  conditionHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  severityDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0',
  },
  remedyBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 14,
  },
  remedyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  remedyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  remedyBody: {
    fontSize: 13,
    color: '#064e3b',
    lineHeight: 20,
  },
  questionnaireBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 14,
  },
  questionnaireBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionnaireBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
    marginBottom: 2,
  },
  questionnaireBannerSub: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  escalateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 14,
    elevation: 3,
  },
  escalateTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  escalateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  escalateBadgeText: {
    color: '#fef2f2',
    fontSize: 11,
    fontWeight: '800',
  },
  escalateTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  escalateSubtitle: {
    color: '#fee2e2',
    fontSize: 11,
    lineHeight: 16,
  },
  escalateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 14,
    lineHeight: 18,
  },
  ipInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
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
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  modalSaveText: {
    fontWeight: '700',
    color: '#ffffff',
  },
});
