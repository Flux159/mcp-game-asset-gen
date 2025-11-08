import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validate3DModelOptions,
  getDefault3DOptions,
  merge3DWithDefaults,
  selectModelVariant,
  generateReferenceImages,
  type Model3DGenerationOptionsExtended,
} from './providers/model3dHelpers.js';

// Mock the imageHelpers module
vi.mock('./providers/imageHelpers.js', () => ({
  generateImage: vi.fn(),
}));

// Mock the model3dUtils module
vi.mock('./utils/model3dUtils.js', () => ({
  trellisGenerate3DSingle: vi.fn(),
  trellisGenerate3DMulti: vi.fn(),
  hunyuan3DGenerateSingle: vi.fn(),
  hunyuan3DGenerateMulti: vi.fn(),
  hunyuan3DGenerateSingleTurbo: vi.fn(),
  hunyuan3DGenerateMultiTurbo: vi.fn(),
  validateBase64ImageURI: vi.fn(),
  convertPathsToBase64URIs: vi.fn(),
}));

import { generateImage } from './providers/imageHelpers.js';
const mockGenerateImage = vi.mocked(generateImage);

describe('3D Model Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validate3DModelOptions', () => {
    it('should pass validation for valid options', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'trellis',
        variant: 'single',
        prompt: 'test model',
      };

      expect(() => validate3DModelOptions(options)).not.toThrow();
    });

    it('should throw error for missing output path', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: '',
        model: 'trellis',
      };

      expect(() => validate3DModelOptions(options)).toThrow('Output path is required and cannot be empty');
    });

    it('should throw error for invalid model', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'invalid' as any,
      };

      expect(() => validate3DModelOptions(options)).toThrow('Model must be one of: trellis, hunyuan3d');
    });

    it('should throw error for invalid variant', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'trellis',
        variant: 'invalid' as any,
      };

      expect(() => validate3DModelOptions(options)).toThrow('Variant must be one of: single, multi, single-turbo, multi-turbo');
    });

    it('should throw error for turbo variant with trellis', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'trellis',
        variant: 'single-turbo',
      };

      expect(() => validate3DModelOptions(options)).toThrow('Trellis model does not support turbo variants');
    });

    it('should throw error when no images or prompt provided', () => {
      const options: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'trellis',
        inputImagePaths: [],
      };

      expect(() => validate3DModelOptions(options)).toThrow('Either input images or a prompt is required for 3D model generation');
    });
  });

  describe('getDefault3DOptions', () => {
    it('should return default options for Trellis', () => {
      const defaults = getDefault3DOptions('trellis');

      expect(defaults).toEqual({
        format: 'glb',
        autoGenerateReferences: true,
        referenceModel: 'gemini',
        referenceViews: ['front', 'back', 'top'],
        cleanupReferences: true,
        model: 'trellis',
        variant: 'multi',
      });
    });

    it('should return default options for Hunyuan3D', () => {
      const defaults = getDefault3DOptions('hunyuan3d');

      expect(defaults).toEqual({
        format: 'glb',
        autoGenerateReferences: true,
        referenceModel: 'gemini',
        referenceViews: ['front', 'back', 'top'],
        cleanupReferences: true,
        model: 'hunyuan3d',
        variant: 'multi',
      });
    });

    it('should throw error for invalid model', () => {
      expect(() => getDefault3DOptions('invalid' as any)).toThrow('No default options available for model: invalid');
    });
  });

  describe('merge3DWithDefaults', () => {
    it('should merge user options with defaults', () => {
      const userOptions: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'trellis',
        variant: 'single', // Override default
        prompt: 'test model',
      };

      const merged = merge3DWithDefaults(userOptions);

      expect(merged).toEqual({
        format: 'glb', // Default
        autoGenerateReferences: true, // Default
        referenceModel: 'gemini', // Default
        referenceViews: ['front', 'back', 'top'], // Default
        cleanupReferences: true, // Default
        model: 'trellis',
        variant: 'single', // User option
        outputPath: 'model.glb',
        prompt: 'test model',
      });
    });

    it('should preserve user options when not conflicting with defaults', () => {
      const userOptions: Model3DGenerationOptionsExtended = {
        outputPath: 'model.glb',
        model: 'hunyuan3d',
        referenceViews: ['front', 'left'], // User-specific option
        prompt: 'test model',
      };

      const merged = merge3DWithDefaults(userOptions);

      expect(merged.referenceViews).toEqual(['front', 'left']); // User option preserved
      expect(merged.variant).toBe('multi'); // Default applied
    });
  });

  describe('selectModelVariant', () => {
    it('should select single variant for Trellis with one image', () => {
      const variant = selectModelVariant('trellis', 1);
      expect(variant).toBe('single');
    });

    it('should select multi variant for Trellis with multiple images', () => {
      const variant = selectModelVariant('trellis', 3);
      expect(variant).toBe('multi');
    });

    it('should select single variant for Hunyuan3D with one image', () => {
      const variant = selectModelVariant('hunyuan3d', 1);
      expect(variant).toBe('single');
    });

    it('should select multi variant for Hunyuan3D with multiple images', () => {
      const variant = selectModelVariant('hunyuan3d', 3);
      expect(variant).toBe('multi');
    });

    it('should select single-turbo for Hunyuan3D with turbo preference', () => {
      const variant = selectModelVariant('hunyuan3d', 1, true);
      expect(variant).toBe('single-turbo');
    });

    it('should select multi-turbo for Hunyuan3D with multiple images and turbo preference', () => {
      const variant = selectModelVariant('hunyuan3d', 3, true);
      expect(variant).toBe('multi-turbo');
    });
  });

  describe('generateReferenceImages', () => {
    it('should generate reference images for specified views', async () => {
      // Mock each call to return a single image path
      mockGenerateImage
        .mockResolvedValueOnce(JSON.stringify({ savedPaths: ['test_front.png'] }))
        .mockResolvedValueOnce(JSON.stringify({ savedPaths: ['test_back.png'] }))
        .mockResolvedValueOnce(JSON.stringify({ savedPaths: ['test_top.png'] }));

      const result = await generateReferenceImages(
        'test object',
        'test_object.png',
        ['front', 'back', 'top'],
        'gemini'
      );

      expect(mockGenerateImage).toHaveBeenCalledTimes(3);
      expect(mockGenerateImage).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'gemini',
        prompt: expect.stringContaining('test object'),
      }));
      expect(result).toEqual(['test_front.png', 'test_back.png', 'test_top.png']);
    });

    it('should generate only front view for single image models', async () => {
      mockGenerateImage.mockResolvedValue(JSON.stringify({ savedPaths: ['test_front.png'] }));

      const result = await generateReferenceImages(
        'test object',
        'test_object.png',
        ['front'], // Single view
        'gemini'
      );

      expect(mockGenerateImage).toHaveBeenCalledTimes(1);
      expect(result).toEqual(['test_front.png']);
    });

    it('should handle generation failures gracefully', async () => {
      mockGenerateImage
        .mockResolvedValueOnce(JSON.stringify({ savedPaths: ['test_front.png'] }))
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce(JSON.stringify({ savedPaths: ['test_top.png'] }));

      const result = await generateReferenceImages(
        'test object',
        'test_object.png',
        ['front', 'back', 'top'],
        'gemini'
      );

      // Should return successful generations even if one fails
      expect(result).toEqual(['test_front.png', 'test_top.png']);
      expect(result).not.toContain('test_back.png');
    });

    it('should use different models for reference generation', async () => {
      mockGenerateImage.mockResolvedValue(JSON.stringify({ savedPaths: ['test.png'] }));

      await generateReferenceImages(
        'test object',
        'test_object.png',
        ['front'],
        'openai'
      );

      expect(mockGenerateImage).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'openai',
        size: '1024x1024'
      }));
    });
  });
});