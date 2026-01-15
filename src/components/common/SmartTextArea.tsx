import React from 'react';
import { Input, Tag, Space, Typography } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

interface Suggestion {
  label: string;
  text: string;
  color?: string;
}

interface SmartTextAreaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  suggestions: Suggestion[];
}

const SmartTextArea: React.FC<SmartTextAreaProps> = ({
  value = '',
  onChange,
  placeholder,
  rows = 6,
  suggestions
}) => {
  
  const handleTagClick = (textToAppend: string) => {
    // Append logic: If empty, set. If not, add double newline then text.
    const newValue = value ? `${value}\n\n${textToAppend}` : textToAppend;
    if (onChange) {
      // Create a synthetic event to match Ant Design's onChange signature
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className="smart-textarea-wrapper">
      <TextArea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{ fontFamily: 'monospace' }} 
      />
      <div style={{ marginTop: '8px' }}>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Quick Insert:
        </Text>
        <Space size={[0, 8]} wrap>
          {suggestions?.map((item, index) => (
            <Tag
              key={index}
              color={item.color || 'blue'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => handleTagClick(item.text)}
            >
              + {item.label}
            </Tag>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default SmartTextArea;
