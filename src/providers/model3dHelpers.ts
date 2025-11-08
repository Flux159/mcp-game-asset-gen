import {
  trellisGenerate3DSingle,
  trellisGenerate3DMulti,
  hunyuan3DGenerateSingle,
  hunyuan3DGenerateMulti,
  hunyuan3DGenerateSingleTurbo,
  hunyuan3DGenerateMultiTurbo,
  type Model3DGenerationOptions,
  type Model3DGenerationResult,
} from '../utils/model3dUtils.js';
import { generateImage } from './imageHelpers.js';
import path from 'path';
import { unlinkSync } from 'fs';

// Enhanced 3D generation options with automatic reference image support
export interface Model3DGenerationOptionsExtended extends Model3DGenerationOptions {
  autoGenerateReferences?: boolean;
  referenceModel?: 'openai' | 'gemini' | 'falai';
  referenceViews?: ('front' | 'back' | 'top' | 'left' | 'right')[];
  cleanupReferences?: boolean;
}

// Helper function to generate reference images for 3D modeling
export const generateReferenceImages = async (
  prompt: string,
  outputBasePath: string,
  views: ('front' | 'back' | 'top' | 'left' | 'right')[] = ['front', 'back', 'top'],
  model: 'openai' | 'gemini' | 'falai' = 'gemini'
): Promise<string[]> => {
  const referencePaths: string[] = [];
  
  for (const view of views) {
    const outputPath = outputBasePath.replace(/\.[^.]+$/, `_ref_${view}.png`);
    
    let viewPrompt = `${prompt}, ${view} view, `;
    viewPrompt += 'technical reference image, clean white background, ';
    viewPrompt += 'professional 3D modeling reference, consistent lighting, ';
    viewPrompt += 'detailed but clear, suitable for 3D reconstruction';
    
    switch (view) {
      case 'front':
        viewPrompt += ', front-facing view showing main features and proportions';
        break;
      case 'back':
        viewPrompt += ', rear view showing back details and construction';
        break;
      case 'top':
        viewPrompt += ', overhead view showing top layout and proportions';
        break;
      case 'left':
        viewPrompt += ', left side profile showing side details and proportions';
        break;
      case 'right':
        viewPrompt += ', right side profile showing opposite side details';
        break;
    }
    
    try {
      const result = await generateImage({
        provider: model,
        prompt: viewPrompt,
        outputPath,
        size: model === 'openai' ? '1024x1024' : undefined,
        image_size: model === 'falai' ? 'square_hd' : undefined,
      });
      
      const parsedResult = JSON.parse(result);
      if (parsedResult.savedPaths && parsedResult.savedPaths.length > 0) {
        referencePaths.push(...parsedResult.savedPaths);
      }
    } catch (error) {
      console.warn(`Failed to generate ${view} reference image:`, error);
      // Continue with other views even if one fails
    }
  }
  
  return referencePaths;
};

// Helper function to determine which model variant to use
export const selectModelVariant = (
  model: 'trellis' | 'hunyuan3d',
  inputImageCount: number,
  preferTurbo: boolean = false
): 'single' | 'multi' | 'single-turbo' | 'multi-turbo' => {
  if (model === 'trellis') {
    return inputImageCount <= 1 ? 'single' : 'multi';
  } else {
    // Hunyuan3D variants
    if (preferTurbo) {
      return inputImageCount <= 1 ? 'single-turbo' : 'multi-turbo';
    } else {
      return inputImageCount <= 1 ? 'single' : 'multi';
    }
  }
};

// Main 3D model generation function with automatic reference handling
export const generate3DModel = async (
  options: Model3DGenerationOptionsExtended
): Promise<Model3DGenerationResult> => {
  const {
    prompt,
    inputImagePaths = [],
    outputPath,
    model,
    variant,
    format = 'glb',
    autoGenerateReferences = true,
    referenceModel = 'gemini',
    referenceViews = ['front', 'back', 'top'],
    cleanupReferences = true,
  } = options;
  
  let finalInputPaths = [...inputImagePaths];
  let generatedReferences: string[] = [];
  
  try {
    // If no input images provided, generate reference images automatically
    if (finalInputPaths.length === 0 && prompt && autoGenerateReferences) {
      console.log('No input images provided, generating reference images automatically...');
      
      const outputBasePath = outputPath.replace(/\.[^.]+$/, '');
      generatedReferences = await generateReferenceImages(
        prompt,
        outputBasePath,
        (variant && variant.includes('multi')) ? referenceViews : ['front'],
        referenceModel
      );
      
      finalInputPaths = generatedReferences;
      
      if (generatedReferences.length === 0) {
        throw new Error('Failed to generate reference images automatically');
      }
    }
    
    // Validate that we have input images
    if (finalInputPaths.length === 0) {
      throw new Error('At least one input image is required for 3D model generation');
    }
    
    // Determine the actual variant to use based on input count
    const actualVariant = variant || selectModelVariant(model, finalInputPaths.length);
    
    // Call the appropriate 3D generation function
    let result: Model3DGenerationResult;
    
    switch (model) {
      case 'trellis':
        if (actualVariant === 'single') {
          result = await trellisGenerate3DSingle({
            prompt,
            imagePath: finalInputPaths[0],
            outputPath,
            format,
          });
        } else {
          result = await trellisGenerate3DMulti({
            prompt,
            imagePaths: finalInputPaths,
            outputPath,
            format,
          });
        }
        break;
        
      case 'hunyuan3d':
        switch (actualVariant) {
          case 'single':
            result = await hunyuan3DGenerateSingle({
              prompt,
              imagePath: finalInputPaths[0],
              outputPath,
              format,
            });
            break;
          case 'multi':
            result = await hunyuan3DGenerateMulti({
              prompt,
              imagePaths: finalInputPaths,
              outputPath,
              format,
            });
            break;
          case 'single-turbo':
            result = await hunyuan3DGenerateSingleTurbo({
              prompt,
              imagePath: finalInputPaths[0],
              outputPath,
              format,
            });
            break;
          case 'multi-turbo':
            result = await hunyuan3DGenerateMultiTurbo({
              prompt,
              imagePaths: finalInputPaths,
              outputPath,
              format,
            });
            break;
          default:
            throw new Error(`Unsupported Hunyuan3D variant: ${actualVariant}`);
        }
        break;
        
      default:
        throw new Error(`Unsupported 3D model: ${model}`);
    }
    
    // Add metadata about automatic reference generation
    if (generatedReferences.length > 0) {
      result.auto_generated_references = generatedReferences;
      result.reference_model_used = referenceModel;
      result.reference_views_generated = referenceViews;
    }
    
    return result;
    
  } finally {
    // Clean up generated reference images if requested
    if (cleanupReferences && generatedReferences.length > 0) {
      for (const refPath of generatedReferences) {
        try {
          unlinkSync(refPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
          console.warn(`Failed to cleanup reference image ${refPath}:`, cleanupError);
        }
      }
    }
  }
};

// Validation function for 3D model generation options
export const validate3DModelOptions = (options: Model3DGenerationOptionsExtended): void => {
  if (!options.outputPath || options.outputPath.trim().length === 0) {
    throw new Error('Output path is required and cannot be empty');
  }
  
  if (!['trellis', 'hunyuan3d'].includes(options.model)) {
    throw new Error('Model must be one of: trellis, hunyuan3d');
  }
  
  if (options.variant && !['single', 'multi', 'single-turbo', 'multi-turbo'].includes(options.variant)) {
    throw new Error('Variant must be one of: single, multi, single-turbo, multi-turbo');
  }
  
  if (options.format && !['glb', 'gltf'].includes(options.format)) {
    throw new Error('Format must be one of: glb, gltf');
  }
  
  // Validate variant compatibility with model
  if (options.model === 'trellis' && options.variant?.includes('turbo')) {
    throw new Error('Trellis model does not support turbo variants');
  }
  
  // If no input images and no prompt, validation fails
  if ((!options.inputImagePaths || options.inputImagePaths.length === 0) && !options.prompt) {
    throw new Error('Either input images or a prompt is required for 3D model generation');
  }
};

// Get default options for 3D model generation
export const getDefault3DOptions = (model: 'trellis' | 'hunyuan3d'): Partial<Model3DGenerationOptionsExtended> => {
  const baseDefaults = {
    format: 'glb' as const,
    autoGenerateReferences: true,
    referenceModel: 'gemini' as const,
    referenceViews: ['front', 'back', 'top'] as ('front' | 'back' | 'top')[],
    cleanupReferences: true,
  };
  
  switch (model) {
    case 'trellis':
      return {
        ...baseDefaults,
        model: 'trellis',
        variant: 'multi', // Prefer multi for better quality
      };
      
    case 'hunyuan3d':
      return {
        ...baseDefaults,
        model: 'hunyuan3d',
        variant: 'multi', // Prefer multi for better quality
      };
      
    default:
      throw new Error(`No default options available for model: ${model}`);
  }
};

// Merge user options with defaults
export const merge3DWithDefaults = (options: Model3DGenerationOptionsExtended): Model3DGenerationOptionsExtended => {
  const defaults = getDefault3DOptions(options.model);
  return { ...defaults, ...options };
};

// Helper function to generate 3D model with smart defaults
export const generate3DModelSmart = async (
  prompt: string,
  outputPath: string,
  model: 'trellis' | 'hunyuan3d' = 'hunyuan3d',
  options: Partial<Model3DGenerationOptionsExtended> = {}
): Promise<Model3DGenerationResult> => {
  const fullOptions: Model3DGenerationOptionsExtended = merge3DWithDefaults({
    prompt,
    outputPath,
    model,
    variant: 'multi', // Ensure variant is always set
    ...options,
  });
  
  validate3DModelOptions(fullOptions);
  
  return await generate3DModel(fullOptions);
};