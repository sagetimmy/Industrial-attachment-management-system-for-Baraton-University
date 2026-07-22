import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

let ReactDatePicker;
if (Platform.OS === 'web') {
  ReactDatePicker = require('react-datepicker').default;
  require('react-datepicker/dist/react-datepicker.css');
}

const TEAL = '#0F6E56';
const BORDER = 'rgba(0,0,0,0.12)';

function formatDisplay(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DatePickerField({
  label,
  value,
  onChange,
  minDate = null,
  maxDate = null,
  placeholder = 'Select date',
  error = null,
  disabled = false,
}) {
  const [nativePickerVisible, setNativePickerVisible] = useState(false);

  // ---- Web ----
  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.webInputWrap, error && styles.inputError, disabled && styles.disabled]}>
          <Ionicons name="calendar-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
          <ReactDatePicker
            selected={value}
            onChange={(date) => !disabled && onChange(date)}
            minDate={minDate || undefined}
            maxDate={maxDate || undefined}
            placeholderText={placeholder}
            dateFormat="dd MMM yyyy"
            disabled={disabled}
            className="iams-date-input"
            wrapperClassName="iams-date-input-wrapper"
          />
        </View>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // ---- Native (iOS / Android) ----
  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.nativeInputWrap, error && styles.inputError, disabled && styles.disabled]}
        onPress={() => !disabled && setNativePickerVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Ionicons name="calendar-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
        <Text style={[styles.nativeInputText, !value && styles.placeholderText]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {nativePickerVisible && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minDate || undefined}
          maximumDate={maxDate || undefined}
          onChange={(event, selectedDate) => {
            // Android closes the picker itself after a selection or dismiss.
            if (Platform.OS === 'android') setNativePickerVisible(false);
            if (event.type === 'dismissed') return;
            if (selectedDate) onChange(selectedDate);
            if (Platform.OS === 'ios') setNativePickerVisible(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },

  webInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  nativeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  nativeInputText: { fontSize: 14, color: '#111' },
  placeholderText: { color: '#999' },
  inputError: { borderColor: '#D85A30' },
  disabled: { opacity: 0.5 },
  errorText: { fontSize: 12, color: '#D85A30', marginTop: 4 },
});