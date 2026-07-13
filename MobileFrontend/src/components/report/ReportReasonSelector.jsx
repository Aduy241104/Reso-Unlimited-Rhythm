import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportReasonSelector({
  groups = [],
  value = '',
  onChange,
  disabled = false,
  error = '',
}) {
  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.optionsWrap}>
            {(Array.isArray(group.options) ? group.options : []).map((option) => {
              const isSelected = option.value === value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    isSelected ? styles.optionChipSelected : null,
                    disabled ? styles.optionChipDisabled : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onChange?.(option.value)}
                  disabled={disabled}
                >
                  <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  group: {
    gap: 10,
  },
  groupLabel: {
    color: '#f3c26b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#151515',
  },
  optionChipSelected: {
    backgroundColor: '#f3c26b',
    borderColor: '#f3c26b',
  },
  optionChipDisabled: {
    opacity: 0.6,
  },
  optionText: {
    color: '#e9e9e9',
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#111111',
  },
  errorText: {
    color: '#ff8f8f',
    fontSize: 12,
    marginTop: -4,
  },
});
