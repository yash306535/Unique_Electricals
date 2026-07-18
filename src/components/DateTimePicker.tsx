import React from 'react';
import { Platform } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';

/**
 * Cross-platform drop-in replacement for @react-native-community/datetimepicker.
 *
 * On native (iOS/Android) it renders the real native picker.
 * On web — where the native module is unsupported and renders nothing — it
 * renders a standard HTML <input type="date/time"> and opens the browser's
 * built-in calendar automatically.
 *
 * The props and the onChange(event, date) signature match the native module,
 * so existing screens only need to swap the import.
 */
type Mode = 'date' | 'time' | 'datetime';

type Props = {
  value: Date;
  mode?: Mode;
  display?: string;
  onChange?: (event: { type: string }, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  [key: string]: any;
};

const pad = (n: number) => String(n).padStart(2, '0');

const toInputValue = (d: Date, mode: Mode): string => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (mode === 'time') return time;
  if (mode === 'datetime') return `${date}T${time}`;
  return date;
};

export default function DateTimePicker(props: Props) {
  if (Platform.OS === 'web') {
    const { value, onChange, mode = 'date', minimumDate, maximumDate } = props;
    const inputRef = React.useRef<any>(null);
    const inputType =
      mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';

    // Open the browser's native calendar/clock as soon as it mounts,
    // mirroring how the native picker pops up on press.
    React.useEffect(() => {
      const el = inputRef.current;
      if (el && typeof el.showPicker === 'function') {
        try {
          el.showPicker();
        } catch {
          /* showPicker can throw outside a user gesture — safe to ignore */
        }
      }
    }, []);

    return React.createElement('input', {
      ref: inputRef,
      type: inputType,
      value: toInputValue(value, mode),
      min: minimumDate ? toInputValue(minimumDate, mode) : undefined,
      max: maximumDate ? toInputValue(maximumDate, mode) : undefined,
      onChange: (e: any) => {
        const raw = e?.target?.value;
        // Parse as local time (avoids the UTC off-by-one from new Date('YYYY-MM-DD')).
        const next =
          raw && mode === 'date'
            ? new Date(`${raw}T00:00:00`)
            : raw
              ? new Date(raw)
              : value;
        onChange?.({ type: 'set' }, next);
      },
      style: {
        fontSize: 16,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        width: '100%',
        boxSizing: 'border-box',
        marginVertical: 8,
      },
    });
  }

  return <RNDateTimePicker {...(props as any)} />;
}
