import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_API_BASE_URL, calculateAgroWeatherRisk } from '../config/api';

const AppContext = createContext(null);

const INITIAL_LEAF_SLOTS = [
  { id: 1, label: 'Leaf 1: Upper Canopy Surface', uri: null, isValid: false, error: null },
  { id: 2, label: 'Leaf 2: Underside / Lesion Close-up', uri: null, isValid: false, error: null },
  { id: 3, label: 'Leaf 3: Alternate Leaf / Branch', uri: null, isValid: false, error: null },
];

export function AppProvider({ children }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [leafSlots, setLeafSlots] = useState(INITIAL_LEAF_SLOTS);
  const [latestDiagnosis, setLatestDiagnosis] = useState(null);
  const [latestImageUri, setLatestImageUri] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherRisk, setWeatherRisk] = useState(null);
  const [persona, setPersona] = useState('farmer'); // 'farmer' | 'gardener'
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState(null);

  const [tickets, setTickets] = useState([
    {
      id: 'AGRI-2026-1042',
      date: 'Today, 10:15 AM',
      disease: 'Tomato Late Blight',
      severity: 'Critical',
      status: 'In Review by Pathologist',
      urgency: 'Critical',
      crop: 'Tomato',
      location: 'Pune District, Maharashtra',
      notes: 'Water-soaked brown lesions rapidly spreading across lower foliage after continuous rain.',
    },
    {
      id: 'AGRI-2026-0988',
      date: 'Yesterday, 3:40 PM',
      disease: 'Bell Pepper Bacterial Spot',
      severity: 'Moderate',
      status: 'Prescription Issued',
      urgency: 'Moderate',
      crop: 'Bell Pepper',
      location: 'Nashik, Maharashtra',
      notes: 'Small circular spots with yellow halos. Recommended copper oxychloride spray.',
    },
  ]);

  // Update an individual leaf slot
  const updateLeafSlot = (slotIndex, uri, isValid, error = null) => {
    setLeafSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = {
        ...updated[slotIndex],
        uri,
        isValid,
        error,
      };
      return updated;
    });
  };

  // Reset all leaf slots
  const resetLeafSlots = () => {
    setLeafSlots(INITIAL_LEAF_SLOTS);
  };

  // Set all 3 leaf slots at once (e.g. For 1-click benchmark demos)
  const setAllLeafSlots = (uris) => {
    setLeafSlots([
      { id: 1, label: 'Leaf 1: Upper Canopy Surface', uri: uris[0] || null, isValid: true, error: null },
      { id: 2, label: 'Leaf 2: Underside / Lesion Close-up', uri: uris[1] || null, isValid: true, error: null },
      { id: 3, label: 'Leaf 3: Alternate Leaf / Branch', uri: uris[2] || null, isValid: true, error: null },
    ]);
  };

  // Save new support ticket
  const addTicket = (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  // Update weather data and re-calculate risk
  const updateWeather = (data, condition = '') => {
    setWeatherData(data);
    const risk = calculateAgroWeatherRisk(data, condition || latestDiagnosis?.condition);
    setWeatherRisk(risk);
  };

  // Submit and refine diagnosis through questionnaire
  const submitQuestionnaire = (answers) => {
    setQuestionnaireAnswers(answers);
    if (latestDiagnosis) {
      // Refine remedies and recommendations based on questionnaire
      let tailoredRemedy = latestDiagnosis.remedy;
      
      if (answers.irrigation === 'Overhead Sprinkler / Hose') {
        tailoredRemedy += '\n\n⚠️ URGENT WATERING NOTICE: Stop overhead sprinkler watering immediately. Splash water is the #1 vector dispersing fungal and bacterial spores to adjacent healthy leaves. Switch to ground drip or base watering.';
      }
      if (answers.symptomAge === 'Over a week ago' && !latestDiagnosis.is_healthy) {
        tailoredRemedy += '\n\n🚨 CHRONIC PROGRESSION ALERT: Since infection has been active for over 7 days, systemic colonization is likely. Immediately prune heavily blighted leaves and submit an expert support ticket.';
      }
      if (answers.priorSpray === 'None' && !latestDiagnosis.is_healthy) {
        tailoredRemedy += '\n\n🌱 FIRST INTERVENTION: No prior spray detected. Apply recommended treatment during morning hours after morning dew has evaporated.';
      }

      setLatestDiagnosis((prev) => ({
        ...prev,
        questionnaireRefined: true,
        tailoredRemedy,
      }));
    }
  };

  return (
    <AppContext.Provider
      value={{
        apiBaseUrl,
        setApiBaseUrl,
        leafSlots,
        updateLeafSlot,
        resetLeafSlots,
        setAllLeafSlots,
        latestDiagnosis,
        setLatestDiagnosis,
        latestImageUri,
        setLatestImageUri,
        currentLocation,
        setCurrentLocation,
        weatherData,
        weatherRisk,
        updateWeather,
        persona,
        setPersona,
        questionnaireAnswers,
        submitQuestionnaire,
        tickets,
        addTicket,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
