import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  LICENSE_TYPES,
  resolveFeatureGateDecision,
  toUtcDayKey,
  type Clock,
  type FeatureGateCounts,
  type LicenseType,
} from '../../domain';
import { useCompositionRoot } from '../../composition';
import { useTheme, type ThemePalette } from '../../theme';

interface CurrentLicenseReader {
  execute(): Promise<LicenseType>;
}

interface CurrentLicenseWriter {
  execute(licenseType: LicenseType): Promise<void>;
}

export interface LicenseScreenViewProps {
  initialLicenseType: LicenseType;
  activeThemePalette: ThemePalette;
  loadCurrentLicenseUseCase: CurrentLicenseReader;
  saveCurrentLicenseUseCase: CurrentLicenseWriter;
  onBack?: () => void;
}

interface LicenseScreenProps {
  onBack?: () => void;
}

const EMPTY_COUNTS: FeatureGateCounts = {
  dreamsCreatedToday: 0,
  audioPlaysLast7Days: 0,
  audioPlaysToday: 0,
  rcSentToday: 0,
  wbtbUsedLast7Days: 0,
  drawingsPerDreamCount: 0,
};

const REALTIME_CLOCK: Clock = {
  now: () => Date.now(),
  todayKey: () => toUtcDayKey(Date.now()),
};

const styles = StyleSheet.create({
  backButton: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 150,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  currentLicenseText: {
    fontSize: 14,
    marginTop: 12,
  },
  description: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginTop: 12,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  sectionDescription: {
    fontSize: 13,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  successText: {
    fontSize: 13,
    marginTop: 12,
  },
  summaryItem: {
    fontSize: 13,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});

function formatLimit(label: string, value: number | null): string {
  const formattedValue = value === null ? 'Unlimited' : value.toString();
  return `${label}: ${formattedValue}`;
}

function formatEnabled(label: string, value: boolean): string {
  return `${label}: ${value ? 'Enabled' : 'Disabled'}`;
}

export function LicenseScreenView({
  initialLicenseType,
  activeThemePalette,
  loadCurrentLicenseUseCase,
  saveCurrentLicenseUseCase,
  onBack,
}: LicenseScreenViewProps) {
  const [licenseType, setLicenseType] = useState<LicenseType>(initialLicenseType);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingLicenseType, setSavingLicenseType] = useState<LicenseType | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadCurrentLicenseUseCase
      .execute()
      .then((storedLicenseType) => {
        if (!isMounted) {
          return;
        }

        setLicenseType(storedLicenseType);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Unable to load license from local storage.');
      });

    return () => {
      isMounted = false;
    };
  }, [loadCurrentLicenseUseCase]);

  const decision = useMemo(
    () => resolveFeatureGateDecision(licenseType, EMPTY_COUNTS, REALTIME_CLOCK),
    [licenseType],
  );

  const handleSelect = (nextLicenseType: LicenseType) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (nextLicenseType === licenseType) {
      return;
    }

    setSavingLicenseType(nextLicenseType);

    saveCurrentLicenseUseCase
      .execute(nextLicenseType)
      .then(() => {
        setLicenseType(nextLicenseType);
        setSuccessMessage('License saved locally.');
      })
      .catch(() => {
        setErrorMessage('Unable to save license locally.');
      })
      .finally(() => {
        setSavingLicenseType(null);
      });
  };

  return (
    <View style={[styles.container, { backgroundColor: activeThemePalette.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: activeThemePalette.textPrimary }]}
      >
        Local License
      </Text>

      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.backButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
            },
          ]}
          testID="license-back-button"
        >
          <Text style={[styles.backButtonText, { color: activeThemePalette.textPrimary }]}>
            Back to settings
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.description, { color: activeThemePalette.textSecondary }]}>
        Select FREE, MEDIUM, or PRO. This entitlement is stored locally only.
      </Text>

      <View style={styles.buttonRow}>
        {LICENSE_TYPES.map((option) => {
          const isActive = licenseType === option;
          const isSaving = savingLicenseType === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              disabled={savingLicenseType !== null}
              onPress={() => {
                handleSelect(option);
              }}
              style={[
                styles.button,
                {
                  borderColor: activeThemePalette.textSecondary,
                  backgroundColor: isActive ? '#1E1E1E' : 'transparent',
                  opacity: isSaving ? 0.7 : 1,
                },
              ]}
              testID={`license-select-${option.toLowerCase()}-button`}
            >
              <Text style={[styles.buttonLabel, { color: activeThemePalette.textPrimary }]}>
                {isSaving ? 'Saving...' : option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={[styles.currentLicenseText, { color: activeThemePalette.textPrimary }]}
        testID="license-current-type"
      >
        Current: {licenseType}
      </Text>

      <View
        style={[
          styles.section,
          {
            backgroundColor: '#101010',
            borderColor: activeThemePalette.textSecondary,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: activeThemePalette.textPrimary }]}>
          Current Limits (Feature Gate)
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Values below are computed from centralized feature-gate rules.
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-history-days"
        >
          {formatLimit('History days', decision.maxHistoryDays)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-dreams-per-day"
        >
          {formatLimit('Dreams/day', decision.maxDreamsPerDay)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-audio-plays-last-7-days"
        >
          {formatLimit('Audio plays/7 days', decision.maxAudioPlaysLast7Days)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-audio-plays-per-day"
        >
          {formatLimit('Audio plays/day', decision.maxAudioPlaysPerDay)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-tag-search-results"
        >
          {formatLimit('Tag search results', decision.maxTagSearchResults)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-rc-per-day"
        >
          {formatLimit('Reality checks/day', decision.maxRcPerDay)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-wbtb-last-7-days"
        >
          {formatLimit('WBTB uses/7 days', decision.maxWbtbUsesLast7Days)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-drawings-per-dream"
        >
          {formatLimit('Drawings/dream', decision.maxDrawingsPerDream)}
        </Text>
        <Text
          style={[styles.summaryItem, { color: activeThemePalette.textPrimary }]}
          testID="license-summary-export-enabled"
        >
          {formatEnabled('Export', decision.exportEnabled)}
        </Text>
      </View>

      {errorMessage ? (
        <Text style={styles.errorText} testID="license-error-message">
          {errorMessage}
        </Text>
      ) : null}

      {successMessage ? (
        <Text
          style={[styles.successText, { color: activeThemePalette.textPrimary }]}
          testID="license-success-message"
        >
          {successMessage}
        </Text>
      ) : null}
    </View>
  );
}

export function LicenseScreen({ onBack }: LicenseScreenProps) {
  const { useCases } = useCompositionRoot();
  const { colors } = useTheme();

  return (
    <LicenseScreenView
      activeThemePalette={colors}
      initialLicenseType="FREE"
      loadCurrentLicenseUseCase={useCases.getCurrentLicenseUseCase}
      saveCurrentLicenseUseCase={useCases.setCurrentLicenseUseCase}
      {...(onBack ? { onBack } : {})}
    />
  );
}
