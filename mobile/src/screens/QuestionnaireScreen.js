import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Sprout,
  Calendar,
  Droplet,
  FlaskConical,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';

const QUESTIONS = [
  {
    id: 'crop',
    title: '1. What crop species are you evaluating?',
    subtitle: 'Confirms the botanical host for specific pathology triage.',
    icon: Sprout,
    options: [
      { label: '🍅 Tomato (Solanum lycopersicum)', value: 'Tomato' },
      { label: '🥔 Potato (Solanum tuberosum)', value: 'Potato' },
      { label: '🫑 Bell Pepper (Capsicum annuum)', value: 'Pepper bell' },
      { label: '🌿 Other Fruit / Vegetable Crop', value: 'Other' },
    ],
  },
  {
    id: 'stage',
    title: '2. What growth stage is the plant currently in?',
    subtitle: 'Dictates safe fungicide withholding periods and pruning limits.',
    icon: Sparkles,
    options: [
      { label: '🌱 Seedling (0-3 weeks nursery)', value: 'Seedling' },
      { label: '🌿 Vegetative (Active foliage & branch growth)', value: 'Vegetative' },
      { label: '🌸 Flowering & Blossom setting', value: 'Flowering' },
      { label: '🍅 Fruiting & Ripening stage', value: 'Fruiting' },
    ],
  },
  {
    id: 'symptomAge',
    title: '3. When did you first notice foliar lesions or spots?',
    subtitle: 'Helps determine if the pathogen is localized or systemically rooted.',
    icon: Calendar,
    options: [
      { label: '⏱️ Just today / Last 24 hours', value: 'Today' },
      { label: '🗓️ 2 to 3 days ago', value: '2-3 days ago' },
      { label: '⚠️ Over a week ago (Spreading rapidly)', value: 'Over a week ago' },
    ],
  },
  {
    id: 'irrigation',
    title: '4. What irrigation or watering method is used?',
    subtitle: 'Overhead splashing is the #1 spreader of fungal conidia spores.',
    icon: Droplet,
    options: [
      { label: '💧 Drip Irrigation (Ground level)', value: 'Drip Irrigation' },
      { label: '🚿 Overhead Sprinkler or Garden Hose', value: 'Overhead Sprinkler / Hose' },
      { label: '🌧️ Flood / Furrow Irrigation', value: 'Flood Irrigation' },
      { label: '🪴 Container / Potted Hand Watering', value: 'Potted Watering' },
    ],
  },
  {
    id: 'priorSpray',
    title: '5. Have you applied any treatment in the last 7 days?',
    subtitle: 'Prevents chemical phytotoxicity and fungicide resistance.',
    icon: FlaskConical,
    options: [
      { label: '❌ None (Untreated crop)', value: 'None' },
      { label: '🌿 Organic Neem Oil / Botanical extract', value: 'Neem Oil' },
      { label: '🧪 Copper-based Fungicide (Bordeaux / Kocide)', value: 'Copper Spray' },
      { label: '💊 Systemic Synthetic Chemical (Metalaxyl, etc.)', value: 'Systemic Chemical' },
    ],
  },
];

export default function QuestionnaireScreen({ navigation }) {
  const {
    latestDiagnosis,
    questionnaireAnswers,
    submitQuestionnaire,
  } = useApp();

  const [selectedAnswers, setSelectedAnswers] = useState({
    crop: latestDiagnosis?.plant || 'Tomato',
    stage: 'Vegetative',
    symptomAge: '2-3 days ago',
    irrigation: 'Drip Irrigation',
    priorSpray: 'None',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (questionId, value) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    submitQuestionnaire(selectedAnswers);
    setSubmitted(true);
    Alert.alert(
      'Questionnaire Saved',
      'Agronomic triage completed! The treatment recommendation has been updated with custom irrigation and pruning directives.'
    );
  };

  const handleReset = () => {
    setSelectedAnswers({
      crop: 'Tomato',
      stage: 'Vegetative',
      symptomAge: '2-3 days ago',
      irrigation: 'Drip Irrigation',
      priorSpray: 'None',
    });
    setSubmitted(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>📝</Text>
          <View>
            <Text style={styles.title}>Agronomic Questionnaire</Text>
            <Text style={styles.subtitle}>Post-Scan Clinical Triage & Dosages</Text>
          </View>
        </View>
      </View>

      {/* Diagnosis Association Banner */}
      {latestDiagnosis ? (
        <View style={styles.activeDiagnosisBanner}>
          <Text style={styles.activeDiagTitle}>Triage for Active Diagnosis:</Text>
          <Text style={styles.activeDiagName}>
            {latestDiagnosis.plant} — {latestDiagnosis.condition}
          </Text>
          <Text style={styles.activeDiagSub}>
            Confidence: {(latestDiagnosis.confidence * 100).toFixed(1)}% •{' '}
            {latestDiagnosis.is_healthy ? 'Healthy' : 'Active Foliar Disease'}
          </Text>
        </View>
      ) : (
        <View style={styles.noDiagnosisBanner}>
          <AlertTriangle size={16} color="#d97706" />
          <Text style={styles.noDiagText}>
            No leaf scanned yet. You can complete this questionnaire in advance or scan 3 leaves in the Scanner tab first.
          </Text>
        </View>
      )}

      {/* Questions Form */}
      {QUESTIONS.map((q) => {
        const IconComponent = q.icon;
        const currentVal = selectedAnswers[q.id];

        return (
          <View key={q.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <IconComponent size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.questionTitle}>{q.title}</Text>
                <Text style={styles.questionSubtitle}>{q.subtitle}</Text>
              </View>
            </View>

            <View style={styles.optionsList}>
              {q.options.map((opt) => {
                const isSelected = currentVal === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionBtn,
                      isSelected && styles.optionBtnSelected,
                    ]}
                    onPress={() => handleSelect(q.id, opt.value)}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Submit Action */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <CheckCircle2 size={20} color="#ffffff" />
          <Text style={styles.submitBtnText}>
            {submitted ? 'Update Triage Advice' : 'Submit & Refine Treatment'}
          </Text>
        </TouchableOpacity>

        {submitted && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <RotateCcw size={16} color="#64748b" />
            <Text style={styles.resetBtnText}>Reset Answers</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Refined Results Card (if submitted) */}
      {submitted && (
        <View style={styles.refinedCard}>
          <View style={styles.refinedHeader}>
            <Sparkles size={18} color="#059669" />
            <Text style={styles.refinedTitle}>Tailored Agronomic Findings:</Text>
          </View>

          {selectedAnswers.irrigation === 'Overhead Sprinkler / Hose' && (
            <View style={styles.warningItem}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text style={styles.warningItemText}>
                <Text style={{ fontWeight: '800' }}>Immediate Action:</Text> Halt overhead sprinkler watering. Switch to base drip lines to stop splash-dispersed fungal spores.
              </Text>
            </View>
          )}

          {selectedAnswers.symptomAge === 'Over a week ago' && (
            <View style={styles.warningItem}>
              <AlertTriangle size={16} color="#d97706" />
              <Text style={styles.warningItemText}>
                <Text style={{ fontWeight: '800' }}>Progression Risk:</Text> Active infection exceeds 7 days. Foliar lesions have penetrated vascular tissue. Prune heavily blighted leaves with sterilized shears.
              </Text>
            </View>
          )}

          <View style={styles.guidelineRow}>
            <Text style={styles.guidelineBullet}>•</Text>
            <Text style={styles.guidelineText}>
              Growth Stage: <Text style={{ fontWeight: '700' }}>{selectedAnswers.stage}</Text>. Keep a 7-day pre-harvest withholding interval before consuming sprayed vegetables.
            </Text>
          </View>

          <View style={styles.guidelineRow}>
            <Text style={styles.guidelineBullet}>•</Text>
            <Text style={styles.guidelineText}>
              Previous Spray: <Text style={{ fontWeight: '700' }}>{selectedAnswers.priorSpray}</Text>. Allow at least 5 days between dissimilar chemical applications to prevent phytotoxicity.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reviewScannerBtn}
            onPress={() => navigation.navigate('Diagnose')}
          >
            <Text style={styles.reviewScannerBtnText}>
              View Updated Treatment on Scanner
            </Text>
            <ArrowRight size={16} color="#047857" />
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 14,
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
  activeDiagnosisBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  activeDiagTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  activeDiagName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064e3b',
    marginVertical: 2,
  },
  activeDiagSub: {
    fontSize: 11,
    color: '#047857',
  },
  noDiagnosisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  noDiagText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  questionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  optionsList: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  optionBtnSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#059669',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  optionLabel: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: '#065f46',
  },
  actionContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  refinedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    gap: 10,
  },
  refinedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  refinedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  warningItemText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  guidelineBullet: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '800',
  },
  guidelineText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  reviewScannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  reviewScannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
});
