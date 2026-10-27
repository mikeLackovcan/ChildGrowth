import React, { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

/** Keep family-authored text readable without horizontal scrolling or cursor jumps. */
export default function ReadableTextInput({ style, onContentSizeChange, ...props }: TextInputProps) {
  const [height, setHeight] = useState(56);
  return <TextInput {...props} multiline scrollEnabled={false}
    style={[style, { minHeight: 56, height, textAlign: 'left', textAlignVertical: 'top' }]}
    onContentSizeChange={event => {
      const next = Math.ceil(event.nativeEvent.contentSize.height);
      setHeight(previous => Math.abs(previous - Math.max(56, next)) > 1 ? Math.max(56, next) : previous);
      onContentSizeChange?.(event);
    }} />;
}
