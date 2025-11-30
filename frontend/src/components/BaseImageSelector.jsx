import React from 'react';
import { Box, Typography } from '@mui/material';
import { Autocomplete, TextField } from '@mui/material';

const BASE_IMAGES = [
  { label: 'Python 3.11', name: 'python', tag: '3.11-slim' },
  { label: 'Python 3.10', name: 'python', tag: '3.10-slim' },
  { label: 'Python 3.9', name: 'python', tag: '3.9-slim' },
  { label: 'TensorFlow', name: 'tensorflow/tensorflow', tag: 'latest' },
  { label: 'PyTorch', name: 'pytorch/pytorch', tag: 'latest' },
  { label: 'Alpine Linux', name: 'alpine', tag: 'latest' },
  { label: 'Ubuntu', name: 'ubuntu', tag: '22.04' },
];

// よく使われるタグのリスト
const COMMON_TAGS = [
  'latest', '3.11', '3.10', '3.9', '3.8',
  '3.11-slim', '3.10-slim', '3.9-slim',
  '3.11-alpine', '3.10-alpine', '3.9-alpine',
  '22.04', '20.04', '18.04',
  '2.10', '2.9', '2.8', '2.7',
];

const BaseImageSelector = React.memo(
  ({ baseImage = 'python:3.11-slim', onUpdate }) => {
    // イメージ名とタグを分割
    const [imageName, setImageName] = React.useState(() => {
      const parts = baseImage.split(':');
      return parts[0];
    });

    const [imageTag, setImageTag] = React.useState(() => {
      const parts = baseImage.split(':');
      return parts.length > 1 ? parts[1] : 'latest';
    });

    const handleImageNameChange = React.useCallback((event, value) => {
      const newName = typeof value === 'string' ? value : value?.name || '';
      setImageName(newName);
      if (newName) {
        onUpdate?.(`${newName}:${imageTag}`);
      }
    }, [imageTag, onUpdate]);

    const handleImageNameInput = React.useCallback((event, value) => {
      setImageName(value);
      if (value) {
        onUpdate?.(`${value}:${imageTag}`);
      }
    }, [imageTag, onUpdate]);

    const handleTagChange = React.useCallback((event, value) => {
      const newTag = typeof value === 'string' ? value : value?.tag || 'latest';
      setImageTag(newTag);
      if (imageName) {
        onUpdate?.(`${imageName}:${newTag}`);
      }
    }, [imageName, onUpdate]);

    const handleTagInput = React.useCallback((event, value) => {
      setImageTag(value);
      if (imageName && value) {
        onUpdate?.(`${imageName}:${value}`);
      }
    }, [imageName, onUpdate]);

    // 現在のイメージ名に対応するプリセットを取得
    const currentImageOption = BASE_IMAGES.find(img => img.name === imageName);

    // 現在のイメージ名に対応する推奨タグのリストを取得
    const suggestedTags = currentImageOption 
      ? BASE_IMAGES.filter(img => img.name === imageName).map(img => img.tag)
      : [];

    const availableTags = [...new Set([...suggestedTags, ...COMMON_TAGS])];

    return (
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: '#4b5563', fontSize: 11, display: 'block', mb: 0.3 }}>
          Base Image
        </Typography>
        
        <Box sx={{ mb: 0.5 }}>
          {/* イメージ名セレクタ */}
          <Typography variant="caption" sx={{ color: '#666', fontSize: 10, display: 'block', mb: 0.2 }}>
            Image Name
          </Typography>
          <Autocomplete
            size="small"
            options={BASE_IMAGES}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            value={currentImageOption || { name: imageName, label: imageName, tag: 'latest' }}
            onChange={handleImageNameChange}
            onInputChange={handleImageNameInput}
            inputValue={imageName}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="e.g. python, tensorflow/tensorflow"
                sx={{ fontSize: 11 }}
              />
            )}
            sx={{ width: '100%' }}
            ListboxProps={{ style: { fontSize: 11 } }}
          />
        </Box>

        <Box>
          {/* タグセレクタ */}
          <Typography variant="caption" sx={{ color: '#666', fontSize: 10, display: 'block', mb: 0.2 }}>
            Tag
          </Typography>
          <Autocomplete
            size="small"
            options={availableTags}
            getOptionLabel={(option) => typeof option === 'string' ? option : option}
            value={imageTag}
            onChange={handleTagChange}
            onInputChange={handleTagInput}
            inputValue={imageTag}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="e.g. latest, 3.11-slim"
                sx={{ fontSize: 11 }}
              />
            )}
            sx={{ width: '100%' }}
            ListboxProps={{ style: { fontSize: 11 } }}
          />
        </Box>
      </Box>
    );
  }
);

BaseImageSelector.displayName = 'BaseImageSelector';

export default BaseImageSelector;
