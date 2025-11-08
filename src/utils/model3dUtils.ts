import { writeFileSync, mkdirSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { 
  makeHTTPRequest, 
  getFalAIKey,
  downloadAndSaveImage,
  encodeImageToBase64
} from './imageUtils.js';

const execFileAsync = promisify(execFile);

// 3D Model generation interfaces
export interface Model3DGenerationOptions {
  prompt?: string;
  inputImagePaths?: string[];
  outputPath: string;
  model: 'trellis' | 'hunyuan3d';
  variant?: 'single' | 'multi' | 'single-turbo' | 'multi-turbo';
  format?: 'glb' | 'gltf';
  quality?: 'standard' | 'high';
}

export interface Model3DGenerationResult {
  provider: string;
  model: string;
  variant: string;
  savedPaths: string[];
  prompt_used?: string;
  input_images: string[];
  generation_time?: number;
  model_info?: {
    vertices?: number;
    faces?: number;
    file_size?: number;
    format?: string;
  };
  parameters: any;
  auto_generated_references?: string[];
  reference_model_used?: string;
  reference_views_generated?: string[];
}

// Validate base64 image URI format
export const validateBase64ImageURI = (uri: string): boolean => {
  const base64Pattern = /^data:image\/(png|jpg|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
  return base64Pattern.test(uri);
};

// Convert file paths to base64 URIs
export const convertPathsToBase64URIs = async (paths: string[]): Promise<string[]> => {
  const uris: string[] = [];
  
  for (const imagePath of paths) {
    try {
      const base64Data = encodeImageToBase64(imagePath);
      const uri = `data:image/png;base64,${base64Data}`;
      uris.push(uri);
    } catch (error) {
      throw new Error(`Failed to convert image ${imagePath} to base64 URI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return uris;
};

// Download and save 3D model files
export const downloadAndSave3DModel = async (modelUrl: string, outputPath: string): Promise<string> => {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });
    
    // Download 3D model file using curl
    const args = ['-s', '-L', '-o', outputPath, modelUrl];
    await execFileAsync('curl', args);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download and save 3D model to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get 3D model file information
export const getModel3DInfo = async (modelPath: string): Promise<{
  vertices?: number;
  faces?: number;
  file_size: number;
  format: string;
}> => {
  try {
    const stats = require('fs').statSync(modelPath);
    const fileSize = stats.size;
    const ext = path.extname(modelPath).toLowerCase();
    
    // For now, return basic info. In the future, we could parse GLB/GLTF files
    // to get vertex and face counts using a 3D library
    return {
      file_size: fileSize,
      format: ext.replace('.', '').toUpperCase(),
    };
  } catch (error) {
    throw new Error(`Failed to get 3D model info for ${modelPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// FAL.ai 3D Model generation functions

// Trellis Single Image Input
export const trellisGenerate3DSingle = async (args: {
  prompt?: string;
  imagePath: string;
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert image to base64 URI if it's a file path
  let imageUri = args.imagePath;
  if (!args.imagePath.startsWith('data:')) {
    imageUri = `data:image/png;base64,${encodeImageToBase64(args.imagePath)}`;
  }
  
  const body = {
    image_url: imageUri,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/trellis';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Trellis API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Trellis response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'trellis',
    variant: 'single',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: [args.imagePath],
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};

// Trellis Multi Image Input
export const trellisGenerate3DMulti = async (args: {
  prompt?: string;
  imagePaths: string[];
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert images to base64 URIs if they are file paths
  const imageUris = await Promise.all(
    args.imagePaths.map(async (path) => {
      if (path.startsWith('data:')) {
        return path;
      } else {
        return `data:image/png;base64,${encodeImageToBase64(path)}`;
      }
    })
  );
  
  const body = {
    image_urls: imageUris,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/trellis-multi-image';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Trellis Multi API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Trellis Multi response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'trellis',
    variant: 'multi',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: args.imagePaths,
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};

// Hunyuan3D Single Image Input
export const hunyuan3DGenerateSingle = async (args: {
  prompt?: string;
  imagePath: string;
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert image to base64 URI if it's a file path
  let imageUri = args.imagePath;
  if (!args.imagePath.startsWith('data:')) {
    imageUri = `data:image/png;base64,${encodeImageToBase64(args.imagePath)}`;
  }
  
  const body = {
    image_url: imageUri,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/hunyuan3d-2.0';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Hunyuan3D API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Hunyuan3D response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'hunyuan3d-2.0',
    variant: 'single',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: [args.imagePath],
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};

// Hunyuan3D Multi Image Input
export const hunyuan3DGenerateMulti = async (args: {
  prompt?: string;
  imagePaths: string[];
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert images to base64 URIs if they are file paths
  const imageUris = await Promise.all(
    args.imagePaths.map(async (path) => {
      if (path.startsWith('data:')) {
        return path;
      } else {
        return `data:image/png;base64,${encodeImageToBase64(path)}`;
      }
    })
  );
  
  const body = {
    image_urls: imageUris,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/hunyuan3d-2.0-multi-image';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Hunyuan3D Multi API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Hunyuan3D Multi response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'hunyuan3d-2.0',
    variant: 'multi',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: args.imagePaths,
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};

// Hunyuan3D Single Turbo
export const hunyuan3DGenerateSingleTurbo = async (args: {
  prompt?: string;
  imagePath: string;
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert image to base64 URI if it's a file path
  let imageUri = args.imagePath;
  if (!args.imagePath.startsWith('data:')) {
    imageUri = `data:image/png;base64,${encodeImageToBase64(args.imagePath)}`;
  }
  
  const body = {
    image_url: imageUri,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/hunyuan3d-2.0-turbo';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Hunyuan3D Turbo API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Hunyuan3D Turbo response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'hunyuan3d-2.0',
    variant: 'single-turbo',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: [args.imagePath],
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};

// Hunyuan3D Multi Turbo
export const hunyuan3DGenerateMultiTurbo = async (args: {
  prompt?: string;
  imagePaths: string[];
  outputPath: string;
  format?: 'glb' | 'gltf';
}): Promise<Model3DGenerationResult> => {
  const apiKey = getFalAIKey();
  
  // Convert images to base64 URIs if they are file paths
  const imageUris = await Promise.all(
    args.imagePaths.map(async (path) => {
      if (path.startsWith('data:')) {
        return path;
      } else {
        return `data:image/png;base64,${encodeImageToBase64(path)}`;
      }
    })
  );
  
  const body = {
    image_urls: imageUris,
    format: args.format || 'glb',
  };
  
  const headers = {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  const endpoint = 'https://fal.run/fal-ai/hunyuan3d-2.0-multi-image-turbo';
  
  const response = await makeHTTPRequest(endpoint, 'POST', headers, body);
  
  if (response.error || response.detail) {
    throw new Error(`Hunyuan3D Multi Turbo API error: ${response.error?.message || JSON.stringify(response.detail || response.error)}`);
  }
  
  // Download and save the 3D model
  const savedPaths: string[] = [];
  
  if (response.model_url) {
    const modelPath = await downloadAndSave3DModel(response.model_url, args.outputPath);
    savedPaths.push(modelPath);
  } else {
    throw new Error('No model URL in Hunyuan3D Multi Turbo response');
  }
  
  // Get model information
  const modelInfo = await getModel3DInfo(args.outputPath);
  
  return {
    provider: 'FAL.ai',
    model: 'hunyuan3d-2.0',
    variant: 'multi-turbo',
    savedPaths: savedPaths,
    prompt_used: args.prompt,
    input_images: args.imagePaths,
    generation_time: response.timings?.inference,
    model_info: modelInfo,
    parameters: body
  };
};