#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  openaiGenerateImage,
  geminiGenerateImage,
  falaiGenerateImage,
  falaiEditImage,
  generateWithProvider,
  generateCharacterSheet,
  generateCharacterVariation,
  generatePixelArtCharacter,
  generateTexture,
  generateObjectSheet,
} from './providers/imageProviders.js';
import {
  generate3DModelSmart,
  type Model3DGenerationOptionsExtended,
} from './providers/model3dHelpers.js';

// Check environment variables for tool filtering
const allowedToolsEnv = process.env.ALLOWED_TOOLS;

// Define all available tools
const allTools = [
  {
    name: 'openai_generate_image',
    description: "Generate images using OpenAI's image generation API",
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the generated image should be saved',
        },
        inputImagePath: {
          type: 'string',
          description: 'Path to input image for editing/variation (optional)',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1792x1024', '1024x1792'],
          description: 'Image dimensions',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
          description: 'Image quality level',
        },
        style: {
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'Image style preference',
        },
        n: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Number of images to generate (1-10)',
        },
      },
      required: ['prompt', 'outputPath'],
    },
  },
  {
    name: 'gemini_generate_image',
    description: "Generate images using Google's Gemini 2.5 Flash native image generation, supports multiple input images for variations",
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the image to generate',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the generated image should be saved',
        },
        inputImagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of paths to input images for variation/combination',
        },
        model: {
          type: 'string',
          description: 'Gemini model to use (default: gemini-2.5-flash-image)',
        },
      },
      required: ['prompt', 'outputPath'],
    },
  },
  {
    name: 'falai_generate_image',
    description: 'Generate high-quality images using FAL.ai\'s Qwen image generation model',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed prompt for image generation',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the generated image should be saved',
        },
        image_size: {
          type: 'string',
          enum: ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
          description: 'Image size preset',
        },
        num_inference_steps: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'Number of inference steps (1-50)',
        },
        guidance_scale: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          description: 'How closely to follow the prompt (1-20)',
        },
      },
      required: ['prompt', 'outputPath'],
    },
  },
  {
    name: 'falai_edit_image',
    description: 'Edit images using FAL.ai\'s Qwen image editing model',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed prompt describing the desired edits',
        },
        inputImagePath: {
          type: 'string',
          description: 'Path to input image to be edited',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the edited image should be saved',
        },
        image_size: {
          type: 'string',
          enum: ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
          description: 'Image size preset',
        },
        num_inference_steps: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'Number of inference steps (1-50)',
        },
        guidance_scale: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          description: 'How closely to follow the prompt (1-20)',
        },
      },
      required: ['prompt', 'inputImagePath', 'outputPath'],
    },
  },
  {
    name: 'generate_character_sheet',
    description: 'Generate character sheets from text descriptions or reference images using any available model',
    inputSchema: {
      type: 'object',
      properties: {
        characterDescription: {
          type: 'string',
          description: 'Detailed description of the character',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the character sheet should be saved',
        },
        referenceImagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of reference image paths (character, outfit, etc.)',
        },
        model: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use for generation (default: gemini)',
        },
        style: {
          type: 'string',
          description: 'Art style for the character sheet (e.g., anime, realistic, cartoon)',
        },
        includeExpressions: {
          type: 'boolean',
          description: 'Include multiple facial expressions',
        },
        includePoses: {
          type: 'boolean',
          description: 'Include multiple poses/angles',
        },
      },
      required: ['characterDescription', 'outputPath'],
    },
  },
  {
    name: 'generate_character_variation',
    description: 'Generate character variations by combining reference images (e.g., character + outfit)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the variation to create',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the variation should be saved',
        },
        referenceImagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of reference image paths to combine',
        },
        model: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use for generation (default: gemini)',
        },
      },
      required: ['prompt', 'outputPath', 'referenceImagePaths'],
    },
  },
  {
    name: 'generate_pixel_art_character',
    description: 'Generate pixel art characters with specific dimensions for retro games, with optional transparent backgrounds',
    inputSchema: {
      type: 'object',
      properties: {
        characterDescription: {
          type: 'string',
          description: 'Description of the pixel art character',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the pixel art should be saved',
        },
        pixelDimensions: {
          type: 'string',
          enum: ['8x8', '16x16', '32x32', '48x48', '64x64', '96x96'],
          description: 'Target pixel dimensions (SNES: 8x8-32x32, RPG Maker: 48x48)',
        },
        spriteSheet: {
          type: 'boolean',
          description: 'Generate sprite sheet with animations',
        },
        model: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use (default: falai)',
        },
        colors: {
          type: 'number',
          minimum: 4,
          maximum: 256,
          description: 'Color palette size (4-256 colors)',
        },
        transparentBackground: {
          type: 'boolean',
          description: 'Generate pixel art with transparent background for game sprites',
        },
        backgroundColor: {
          type: 'string',
          enum: ['white', 'black', 'auto'],
          description: 'Background color to make transparent (default: white)',
        },
      },
      required: ['characterDescription', 'outputPath', 'pixelDimensions'],
    },
  },
  {
    name: 'generate_texture',
    description: 'Generate seamless textures for 3D environments and materials with optional transparent backgrounds for sprites/decals',
    inputSchema: {
      type: 'object',
      properties: {
        textureDescription: {
          type: 'string',
          description: 'Description of the texture (e.g., grass field, brick wall, wood planks, sprite object)',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the texture should be saved',
        },
        textureSize: {
          type: 'string',
          enum: ['512x512', '1024x1024', '2048x2048'],
          description: 'Texture resolution (default: 1024x1024)',
        },
        seamless: {
          type: 'boolean',
          description: 'Generate seamless/tileable texture',
        },
        model: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use (default: falai)',
        },
        materialType: {
          type: 'string',
          enum: ['diffuse', 'normal', 'roughness', 'displacement'],
          description: 'Type of texture map',
        },
        transparentBackground: {
          type: 'boolean',
          description: 'Generate texture with transparent background for sprites/decals',
        },
        backgroundColor: {
          type: 'string',
          enum: ['white', 'black', 'auto'],
          description: 'Background color to make transparent (default: white)',
        },
        transparencyTolerance: {
          type: 'number',
          minimum: 0,
          maximum: 255,
          description: 'Color variation tolerance for transparency (0-255, default: 30)',
        },
      },
      required: ['textureDescription', 'outputPath'],
    },
  },
  {
    name: 'generate_object_sheet',
    description: 'Generate multi-viewpoint reference sheets for 3D modeling (front, side, back, top views)',
    inputSchema: {
      type: 'object',
      properties: {
        objectDescription: {
          type: 'string',
          description: 'Description of the 3D object',
        },
        outputBasePath: {
          type: 'string',
          description: 'Base path for output files (will append _front.png, _side.png, etc.)',
        },
        viewpoints: {
          type: 'array',
          items: { type: 'string', enum: ['front', 'back', 'left', 'right', 'top', 'bottom', 'perspective'] },
          description: 'Viewpoints to generate',
        },
        model: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use (default: gemini)',
        },
        style: {
          type: 'string',
          description: 'Art style (e.g., technical drawing, concept art)',
        },
      },
      required: ['objectDescription', 'outputBasePath'],
    },
  },
  {
    name: 'trellis_generate_3d_model',
    description: 'Generate 3D models using FAL.ai Trellis model with automatic reference image generation',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the 3D model to generate (used for automatic reference image generation)',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the generated 3D model should be saved (.glb or .gltf)',
        },
        inputImagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of paths to input images or base64 URIs (data:image/png;base64,...). If not provided, reference images will be generated automatically.',
        },
        variant: {
          type: 'string',
          enum: ['single', 'multi'],
          description: 'Model variant: single (1 image) or multi (multiple images). Default: multi for better quality',
        },
        format: {
          type: 'string',
          enum: ['glb', 'gltf'],
          description: 'Output format (default: glb for web/game compatibility)',
        },
        autoGenerateReferences: {
          type: 'boolean',
          description: 'Automatically generate reference images from prompt if no input images provided (default: true)',
        },
        referenceModel: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use for automatic reference image generation (default: gemini)',
        },
        referenceViews: {
          type: 'array',
          items: { type: 'string', enum: ['front', 'back', 'top', 'left', 'right'] },
          description: 'Views to generate for reference images (default: ["front", "back", "top"])',
        },
        cleanupReferences: {
          type: 'boolean',
          description: 'Clean up automatically generated reference images after 3D generation (default: true)',
        },
      },
      required: ['outputPath'],
    },
  },
  {
    name: 'hunyuan3d_generate_3d_model',
    description: 'Generate 3D models using FAL.ai Hunyuan3D 2.0 model with automatic reference image generation and turbo options',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the 3D model to generate (used for automatic reference image generation)',
        },
        outputPath: {
          type: 'string',
          description: 'Path where the generated 3D model should be saved (.glb or .gltf)',
        },
        inputImagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of paths to input images or base64 URIs (data:image/png;base64,...). If not provided, reference images will be generated automatically.',
        },
        variant: {
          type: 'string',
          enum: ['single', 'multi', 'single-turbo', 'multi-turbo'],
          description: 'Model variant: single (1 image), multi (multiple images), or turbo versions for faster generation. Default: multi for better quality',
        },
        format: {
          type: 'string',
          enum: ['glb', 'gltf'],
          description: 'Output format (default: glb for web/game compatibility)',
        },
        autoGenerateReferences: {
          type: 'boolean',
          description: 'Automatically generate reference images from prompt if no input images provided (default: true)',
        },
        referenceModel: {
          type: 'string',
          enum: ['openai', 'gemini', 'falai'],
          description: 'Model to use for automatic reference image generation (default: gemini)',
        },
        referenceViews: {
          type: 'array',
          items: { type: 'string', enum: ['front', 'back', 'top', 'left', 'right'] },
          description: 'Views to generate for reference images (default: ["front", "back", "top"])',
        },
        cleanupReferences: {
          type: 'boolean',
          description: 'Clean up automatically generated reference images after 3D generation (default: true)',
        },
      },
      required: ['outputPath'],
    },
  },
];

const server = new Server(
  {
    name: 'mcp-asset-gen',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  let tools;

  if (allowedToolsEnv) {
    const allowedToolNames = allowedToolsEnv.split(",").map((t) => t.trim());
    tools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
  } else {
    tools = allTools;
  }

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'openai_generate_image': {
        const result = await openaiGenerateImage(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'gemini_generate_image': {
        const result = await geminiGenerateImage(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'falai_generate_image': {
        const result = await falaiGenerateImage(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'falai_edit_image': {
        const result = await falaiEditImage(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'generate_character_sheet': {
        const result = await generateCharacterSheet(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'generate_character_variation': {
        const result = await generateCharacterVariation(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'generate_pixel_art_character': {
        const result = await generatePixelArtCharacter(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'generate_texture': {
        const result = await generateTexture(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'generate_object_sheet': {
        const result = await generateObjectSheet(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'trellis_generate_3d_model': {
        if (!args) {
          throw new Error('Arguments are required for trellis_generate_3d_model');
        }
        if (!args.outputPath) {
          throw new Error('outputPath is required for trellis_generate_3d_model');
        }
        const result = await generate3DModelSmart(
          (args as any).prompt || '',
          (args as any).outputPath,
          'trellis',
          args as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'hunyuan3d_generate_3d_model': {
        if (!args) {
          throw new Error('Arguments are required for hunyuan3d_generate_3d_model');
        }
        if (!args.outputPath) {
          throw new Error('outputPath is required for hunyuan3d_generate_3d_model');
        }
        const result = await generate3DModelSmart(
          (args as any).prompt || '',
          (args as any).outputPath,
          'hunyuan3d',
          args as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'asset_generation',
        description: 'Generate various types of assets for game development',
        arguments: [
          {
            name: 'asset_type',
            description: 'Type of asset to generate (image, video, audio, 3d)',
            required: true,
          },
          {
            name: 'style',
            description: 'Art style or theme for the asset',
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'asset_generation') {
    const { asset_type, style } = args as {
      asset_type: string;
      style?: string;
    };

    const styleText = style ? ` in ${style} style` : '';
    return {
      description: `Generate a ${asset_type} asset${styleText} for game development`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${asset_type} asset${styleText} suitable for game development. Please provide detailed specifications and requirements.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Asset Generation Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

export { allTools };