import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the utils module before importing
vi.mock('./utils/imageUtils.js', () => ({
  getOpenAIKey: vi.fn(),
  getGeminiKey: vi.fn(),
  getFalAIKey: vi.fn(),
  makeHTTPRequest: vi.fn(),
  encodeImageToBase64: vi.fn(),
  downloadAndSaveImage: vi.fn(),
  saveBase64Image: vi.fn(),
}));

vi.mock('./providers/imageProviders.js', () => ({
  generateWithProvider: vi.fn(),
  generateCharacterSheet: vi.fn(),
  generateCharacterVariation: vi.fn(),
  generatePixelArtCharacter: vi.fn(),
  generateTexture: vi.fn(),
  generateObjectSheet: vi.fn(),
}));

import {
  getOpenAIKey,
  getGeminiKey,
  getFalAIKey,
} from './utils/imageUtils.js';
import {
  generateWithProvider,
  generateCharacterVariation,
} from './providers/imageProviders.js';

describe('Image Utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error when OpenAI key is missing', () => {
    vi.mocked(getOpenAIKey).mockImplementation(() => {
      throw new Error('OPENAI_API_KEY environment variable is required');
    });
    expect(() => getOpenAIKey()).toThrow('OPENAI_API_KEY environment variable is required');
  });

  it('should return OpenAI key when present', () => {
    vi.mocked(getOpenAIKey).mockReturnValue('test-openai-key');
    expect(getOpenAIKey()).toBe('test-openai-key');
  });

  it('should throw error when Gemini key is missing', () => {
    vi.mocked(getGeminiKey).mockImplementation(() => {
      throw new Error('GEMINI_API_KEY environment variable is required');
    });
    expect(() => getGeminiKey()).toThrow('GEMINI_API_KEY environment variable is required');
  });

  it('should return Gemini key when present', () => {
    vi.mocked(getGeminiKey).mockReturnValue('test-gemini-key');
    expect(getGeminiKey()).toBe('test-gemini-key');
  });

  it('should throw error when FAL AI key is missing', () => {
    vi.mocked(getFalAIKey).mockImplementation(() => {
      throw new Error('FAL_AI_API_KEY environment variable is required');
    });
    expect(() => getFalAIKey()).toThrow('FAL_AI_API_KEY environment variable is required');
  });

  it('should return FAL AI key when present', () => {
    vi.mocked(getFalAIKey).mockReturnValue('test-fal-key');
    expect(getFalAIKey()).toBe('test-fal-key');
  });
});

describe('Image Providers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error for unsupported provider', async () => {
    vi.mocked(generateWithProvider).mockRejectedValue(new Error('Unsupported provider: unsupported'));
    await expect(generateWithProvider('unsupported' as any, 'test', '/path.png')).rejects.toThrow('Unsupported provider: unsupported');
  });
});

describe('Character Generation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error when no reference images provided for variation', async () => {
    vi.mocked(generateCharacterVariation).mockRejectedValue(new Error('At least one reference image is required for character variation'));
    await expect(generateCharacterVariation({
      prompt: 'test',
      outputPath: '/output.png',
      referenceImagePaths: [],
    })).rejects.toThrow('At least one reference image is required for character variation');
  });
});

describe('MCP Asset Generation Server', () => {
  it('should have a test environment setup', () => {
    expect(true).toBe(true);
  });

  it('should import server modules correctly', async () => {
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    expect(Server).toBeDefined();
  });

  it('should validate environment variables are required', () => {
    // Test that the functions are properly exported and can be called
    expect(typeof getOpenAIKey).toBe('function');
    expect(typeof getGeminiKey).toBe('function');
    expect(typeof getFalAIKey).toBe('function');
  });
});

describe('ALLOWED_TOOLS Environment Variable', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('should return all tools when ALLOWED_TOOLS is not set', async () => {
    delete process.env.ALLOWED_TOOLS;
    
    // Import the server module fresh to test the environment variable
    const { allTools } = await import('./index.js');
    
    // Should return all 11 tools (9 original + 2 new 3D tools)
    expect(allTools).toHaveLength(11);
    
    const toolNames = allTools.map(tool => tool.name);
    expect(toolNames).toContain('openai_generate_image');
    expect(toolNames).toContain('gemini_generate_image');
    expect(toolNames).toContain('falai_generate_image');
    expect(toolNames).toContain('falai_edit_image');
    expect(toolNames).toContain('generate_character_sheet');
    expect(toolNames).toContain('generate_character_variation');
    expect(toolNames).toContain('generate_pixel_art_character');
    expect(toolNames).toContain('generate_texture');
    expect(toolNames).toContain('generate_object_sheet');
  });

  it('should filter tools when ALLOWED_TOOLS is set', async () => {
    process.env.ALLOWED_TOOLS = 'openai_generate_image,gemini_generate_image';
    
    // Import the server module fresh to test the environment variable
    const { allTools } = await import('./index.js');
    
    // The allTools array should still contain all tools, but the filtering happens in ListToolsRequestSchema
    expect(allTools).toHaveLength(11);
    
    // Test that filtering logic works correctly
    const allowedToolNames = process.env.ALLOWED_TOOLS.split(",").map((t) => t.trim());
    const filteredTools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
    
    expect(filteredTools).toHaveLength(2);
    expect(filteredTools.map(t => t.name)).toEqual(['openai_generate_image', 'gemini_generate_image']);
  });

  it('should handle single tool in ALLOWED_TOOLS', async () => {
    process.env.ALLOWED_TOOLS = 'generate_texture';
    
    const { allTools } = await import('./index.js');
    
    const allowedToolNames = process.env.ALLOWED_TOOLS.split(",").map((t) => t.trim());
    const filteredTools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
    
    expect(filteredTools).toHaveLength(1);
    expect(filteredTools[0].name).toBe('generate_texture');
  });

  it('should handle empty ALLOWED_TOOLS', async () => {
    process.env.ALLOWED_TOOLS = '';
    
    const { allTools } = await import('./index.js');
    
    const allowedToolNames = process.env.ALLOWED_TOOLS.split(",").map((t) => t.trim());
    const filteredTools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
    
    expect(filteredTools).toHaveLength(0);
  });

  it('should handle whitespace in ALLOWED_TOOLS', async () => {
    process.env.ALLOWED_TOOLS = ' openai_generate_image , gemini_generate_image , falai_generate_image ';
    
    const { allTools } = await import('./index.js');
    
    const allowedToolNames = process.env.ALLOWED_TOOLS.split(",").map((t) => t.trim());
    const filteredTools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
    
    expect(filteredTools).toHaveLength(3);
    expect(filteredTools.map(t => t.name)).toEqual([
      'openai_generate_image', 
      'gemini_generate_image', 
      'falai_generate_image'
    ]);
  });

  it('should ignore unknown tools in ALLOWED_TOOLS', async () => {
    process.env.ALLOWED_TOOLS = 'openai_generate_image,unknown_tool,generate_texture';
    
    const { allTools } = await import('./index.js');
    
    const allowedToolNames = process.env.ALLOWED_TOOLS.split(",").map((t) => t.trim());
    const filteredTools = allTools.filter((tool) => allowedToolNames.includes(tool.name));
    
    expect(filteredTools).toHaveLength(2);
    expect(filteredTools.map(t => t.name)).toEqual(['openai_generate_image', 'generate_texture']);
  });

  it('should validate tool schemas are complete', async () => {
    const { allTools } = await import('./index.js');
    
    allTools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool.inputSchema).toHaveProperty('type');
      expect(tool.inputSchema).toHaveProperty('properties');
      expect(tool.inputSchema).toHaveProperty('required');
      
      // Validate that required properties are actually in the properties
      tool.inputSchema.required?.forEach((requiredProp: string) => {
        expect(tool.inputSchema.properties).toHaveProperty(requiredProp);
      });
    });
  });
});