import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "dotenv";
import path from "path";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { createCanvas, loadImage } from "canvas";

// Load environment variables from the root .env file
config({ path: path.resolve(process.cwd(), ".env") });

const execFileAsync = promisify(execFile);

// Environment variable getters
export const getOpenAIKey = (): string => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return key;
};

export const getGeminiKey = (): string => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return key;
};

export const getFalAIKey = (): string => {
  const key = process.env.FAL_AI_API_KEY;
  if (!key) {
    throw new Error("FAL_AI_API_KEY environment variable is required");
  }
  return key;
};

// Generic HTTP request helper
export const makeHTTPRequest = async (
  url: string, 
  method: string = "POST", 
  headers: Record<string, string> = {}, 
  body?: any
): Promise<any> => {
  const args = [
    '-s',
    '-X', method,
    url
  ];
  
  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    args.push('-H', `${key}: ${value}`);
  });
  
  // Add body if present - for large payloads, use a temp file
  if (body && method !== "GET") {
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 50000) { // If body is large, use temp file
      const tempFile = `/tmp/fal_request_${Date.now()}.json`;
      writeFileSync(tempFile, bodyStr);
      args.push('-d', `@${tempFile}`);
      
      try {
        const { stdout } = await execFileAsync('curl', args, { maxBuffer: 1024 * 1024 * 10 });
        // Clean up temp file
        try { 
          unlinkSync(tempFile); 
        } catch (cleanupError) {
          // Ignore cleanup errors
          console.warn('Failed to cleanup temp file:', cleanupError);
        }
        return JSON.parse(stdout);
      } catch (error) {
        // Clean up temp file on error
        try { 
          unlinkSync(tempFile); 
        } catch (cleanupError) {
          // Ignore cleanup errors
          console.warn('Failed to cleanup temp file:', cleanupError);
        }
        throw error;
      }
    } else {
      args.push('-d', bodyStr);
    }
  }
  
  try {
    const { stdout } = await execFileAsync('curl', args, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// File operation helpers
export const encodeImageToBase64 = (imagePath: string): string => {
  try {
    const imageBuffer = readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to read image file ${imagePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const downloadAndSaveImage = async (imageUrl: string, outputPath: string): Promise<string> => {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });
    
    // Download image using curl
    const args = ['-s', '-o', outputPath, imageUrl];
    await execFileAsync('curl', args);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download and save image to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const saveBase64Image = (base64Data: string, outputPath: string): string => {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });
    
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer and write to file
    const imageBuffer = Buffer.from(base64Clean, 'base64');
    writeFileSync(outputPath, imageBuffer);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to save base64 image to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Convert image with solid background to transparent background using native JavaScript
export const convertToTransparentBackground = async (
  inputPath: string,
  outputPath: string,
  options: {
    backgroundColor?: 'white' | 'black' | 'auto';
    tolerance?: number; // 0-255, how much color variation to allow
    blur?: number; // Optional blur to smooth edges (not implemented in native version)
  } = {}
): Promise<string> => {
  try {
    const {
      backgroundColor = 'auto',
      tolerance = 30,
      blur = 0
    } = options;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });

    // Read the input image
    const imageBuffer = readFileSync(inputPath);
    
    // Parse PNG and convert background pixels to transparent
    const transparentBuffer = await convertImagePixelsToTransparent(imageBuffer, backgroundColor, tolerance);
    
    // Write the transparent image
    writeFileSync(outputPath, transparentBuffer);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert image to transparent background: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Generate image with transparent background using two-step process
export const generateTransparentImage = async (
  prompt: string,
  outputPath: string,
  provider: 'openai' | 'gemini' | 'falai',
  options: {
    backgroundColor?: 'white' | 'black';
    tolerance?: number;
    blur?: number;
    // Additional generation options
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    image_size?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
    num_inference_steps?: number;
    guidance_scale?: number;
  } = {}
): Promise<string> => {
  try {
    const {
      backgroundColor = 'white',
      tolerance = 30,
      blur = 1,
      ...generationOptions
    } = options;

    // Step 1: Generate image with solid background
    const transparentPrompt = `${prompt}, plain ${backgroundColor} background, no shadows, isolated subject, professional product photography style`;
    
    const tempPath = outputPath.replace(/\.[^.]+$/, '_temp_solid.png');
    
    // Import generateImage function
    const { generateImage } = await import('../providers/imageHelpers.js');
    
    await generateImage({
      provider,
      prompt: transparentPrompt,
      outputPath: tempPath,
      ...generationOptions
    });

    // Step 2: Convert solid background to transparent using native JavaScript
    const finalPath = await convertToTransparentBackground(
      tempPath,
      outputPath,
      {
        backgroundColor,
        tolerance,
        blur
      }
    );

    // Clean up temporary file
    try {
      unlinkSync(tempPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup temporary file:', cleanupError);
    }

    return finalPath;
  } catch (error) {
    throw new Error(`Failed to generate transparent image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Convert image pixels to transparent using canvas
const convertImagePixelsToTransparent = async (
  imageBuffer: Buffer,
  backgroundColor: 'white' | 'black' | 'auto',
  tolerance: number
): Promise<Buffer> => {
  try {
    // Load the image
    const image = await loadImage(imageBuffer);
    
    // Create canvas with the same dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the image
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Determine target color based on background type
    let targetR = 255, targetG = 255, targetB = 255; // Default to white
    
    if (backgroundColor === 'black') {
      targetR = 0; targetG = 0; targetB = 0;
    } else if (backgroundColor === 'auto') {
      // Sample corners to determine background color
      const corners = [
        { x: 0, y: 0 }, // top-left
        { x: canvas.width - 1, y: 0 }, // top-right
        { x: 0, y: canvas.height - 1 }, // bottom-left
        { x: canvas.width - 1, y: canvas.height - 1 } // bottom-right
      ];
      
      let totalR = 0, totalG = 0, totalB = 0;
      for (const corner of corners) {
        const idx = (corner.y * canvas.width + corner.x) * 4;
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
      }
      
      targetR = Math.round(totalR / 4);
      targetG = Math.round(totalG / 4);
      targetB = Math.round(totalB / 4);
    }
    
    // Convert pixels matching target color to transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate color distance from target
      const distance = Math.sqrt(
        Math.pow(r - targetR, 2) + 
        Math.pow(g - targetG, 2) + 
        Math.pow(b - targetB, 2)
      );
      
      // If within tolerance, make transparent
      if (distance <= tolerance) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    throw new Error(`Failed to convert image pixels: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Check if native transparency conversion is available (always true for our implementation)
export const checkTransparencySupportAvailable = (): Promise<boolean> => {
  return Promise.resolve(true);
};