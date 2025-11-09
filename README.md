# MCP Asset Generation Server

<img width="1645" height="1034" alt="Screenshot 2025-11-09 at 9 15 04 AM" src="https://github.com/user-attachments/assets/d2bc7cda-8a09-4588-b3c8-7f430cfde2ee" />

A Model Context Protocol (MCP) server for generating various types of assets including images, videos, audio, and 3D models for game development.

Three.js sample scene in [demo video](https://www.youtube.com/watch?v=KSVpJFqF5hg) located at [flux159/three-generator](https://github.com/Flux159/three-generator).

## Features

- **Image Generation**: Support for multiple providers (OpenAI DALL-E, Google Gemini, Fal.ai)
- **Video Generation**: Coming soon
- **Audio Generation**: Coming soon  
- **3D Model Generation**: Generate 3D models using FAL.ai Trellis and Hunyuan3D 2.0
- **Game Development Focus**: Optimized for creating game assets

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-game-asset-gen

# Install dependencies
npm install

# Build the project
npm run build
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Usage

The server provides tools and prompts for asset generation through the MCP protocol.

### Available Tools

#### Image Generation
- `openai_generate_image`: Generate images using OpenAI's image generation API
  - Parameters:
    - `prompt` (required): Detailed description of the image to generate
    - `outputPath` (required): Path where the generated image should be saved
    - `inputImagePath` (optional): Path to input image for editing/variation
    - `size` (optional): Image dimensions ('1024x1024', '1792x1024', '1024x1792')
    - `quality` (optional): Image quality level ('standard', 'hd')
    - `style` (optional): Image style preference ('vivid', 'natural')
    - `n` (optional): Number of images to generate (1-10)

- `gemini_generate_image`: Generate images using Google's Gemini 2.5 Flash native image generation
  - Parameters:
    - `prompt` (required): Description of the image to generate
    - `outputPath` (required): Path where the generated image should be saved
    - `inputImagePaths` (optional): Array of paths to input images for variation/combination
    - `model` (optional): Gemini model to use (default: gemini-2.5-flash-image)

- `falai_generate_image`: Generate high-quality images using FAL.ai's Qwen image generation model
  - Parameters:
    - `prompt` (required): Detailed prompt for image generation
    - `outputPath` (required): Path where the generated image should be saved
    - `image_size` (optional): Image size preset ('square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9')
    - `num_inference_steps` (optional): Number of inference steps (1-50)
    - `guidance_scale` (optional): How closely to follow the prompt (1-20)

- `falai_edit_image`: Edit images using FAL.ai's Qwen image editing model
  - Parameters:
    - `prompt` (required): Detailed prompt describing the desired edits
    - `inputImagePath` (required): Path to input image to be edited
    - `outputPath` (required): Path where the edited image should be saved
    - `image_size` (optional): Image size preset
    - `num_inference_steps` (optional): Number of inference steps (1-50)
    - `guidance_scale` (optional): How closely to follow the prompt (1-20)

#### Game Asset Generation
- `generate_character_sheet`: Generate character sheets from text descriptions or reference images
  - Parameters:
    - `characterDescription` (required): Detailed description of the character
    - `outputPath` (required): Path where the character sheet should be saved
    - `referenceImagePaths` (optional): Array of reference image paths (character, outfit, etc.)
    - `model` (optional): Model to use for generation ('openai', 'gemini', 'falai', default: gemini)
    - `style` (optional): Art style for the character sheet (e.g., anime, realistic, cartoon)
    - `includeExpressions` (optional): Include multiple facial expressions
    - `includePoses` (optional): Include multiple poses/angles

- `generate_character_variation`: Generate character variations by combining reference images
  - Parameters:
    - `prompt` (required): Description of the variation to create
    - `outputPath` (required): Path where the variation should be saved
    - `referenceImagePaths` (required): Array of reference image paths to combine
    - `model` (optional): Model to use for generation ('openai', 'gemini', 'falai', default: gemini)

- `generate_pixel_art_character`: Generate pixel art characters with specific dimensions for retro games
  - Parameters:
    - `characterDescription` (required): Description of the pixel art character
    - `outputPath` (required): Path where the pixel art should be saved
    - `pixelDimensions` (required): Target pixel dimensions ('8x8', '16x16', '32x32', '48x48', '64x64', '96x96')
    - `spriteSheet` (optional): Generate sprite sheet with animations
    - `model` (optional): Model to use (default: falai)
    - `colors` (optional): Color palette size (4-256 colors)
    - `transparentBackground` (optional): Generate pixel art with transparent background for game sprites
    - `backgroundColor` (optional): Background color to make transparent ('white', 'black', 'auto', default: white)

- `generate_texture`: Generate seamless textures for 3D environments and materials
  - Parameters:
    - `textureDescription` (required): Description of the texture (e.g., grass field, brick wall, wood planks, sprite object)
    - `outputPath` (required): Path where the texture should be saved
    - `textureSize` (optional): Texture resolution ('512x512', '1024x1024', '2048x2048', default: 1024x1024)
    - `seamless` (optional): Generate seamless/tileable texture
    - `model` (optional): Model to use (default: falai)
    - `materialType` (optional): Type of texture map ('diffuse', 'normal', 'roughness', 'displacement')
    - `transparentBackground` (optional): Generate texture with transparent background for sprites/decals
    - `backgroundColor` (optional): Background color to make transparent ('white', 'black', 'auto', default: white)
    - `transparencyTolerance` (optional): Color variation tolerance for transparency (0-255, default: 30)

- `generate_object_sheet`: Generate multi-viewpoint reference sheets for 3D modeling
  - Parameters:
    - `objectDescription` (required): Description of the 3D object
    - `outputBasePath` (required): Base path for output files (will append _front.png, _side.png, etc.)
    - `viewpoints` (optional): Viewpoints to generate ('front', 'back', 'left', 'right', 'top', 'bottom', 'perspective')
    - `model` (optional): Model to use (default: gemini)
    - `style` (optional): Art style (e.g., technical drawing, concept art)

#### 3D Model Generation
- `image_to_3d`: Generate 3D models from images using advanced AI models with automatic reference image generation
  - Parameters:
    - `outputPath` (required): Path where the generated 3D model should be saved (.glb or .gltf)
    - `prompt` (optional): Description of the 3D model to generate (used for automatic reference image generation)
    - `inputImagePaths` (optional): Array of paths to input images or base64 URIs. If not provided, reference images will be generated automatically
    - `model` (optional): 3D generation model ('hunyuan3d', 'trellis', 'hunyuan-world', default: hunyuan3d)
    - `variant` (optional): Model variant ('single', 'multi', 'single-turbo', 'multi-turbo', default: auto-selected)
    - `format` (optional): Output format ('glb', 'gltf', default: glb for web/game compatibility)
    - `textured_mesh` (optional): Generate textured mesh (Hunyuan3D only, 3x cost, default: true)
    - `autoGenerateReferences` (optional): Automatically generate reference images from prompt if no input images provided (default: true)
    - `referenceModel` (optional): Model to use for automatic reference image generation ('openai', 'gemini', 'falai', default: gemini)
    - `referenceViews` (optional): Views to generate for reference images (default: ["front", "back", "top"])
    - `cleanupReferences` (optional): Clean up automatically generated reference images after 3D generation (default: true)

### Available Prompts

- `asset_generation`: Generate various types of assets for game development
  - Parameters:
    - `asset_type` (required): Type of asset ('image', 'video', 'audio', '3d')
    - `style` (optional): Art style or theme

## Configuration

You'll need to configure API keys for the various providers:

```bash
# Environment variables
export OPENAI_API_KEY="your-openai-key"
export GEMINI_API_KEY="your-gemini-key"
export FAL_AI_API_KEY="your-fal-key"
```

### Tool Filtering (Optional)

To reduce context usage, you can restrict which tools are available:

```bash
# Only expose specific tools
export ALLOWED_TOOLS="openai_generate_image,gemini_generate_image,generate_texture"

# Available tools:
# - openai_generate_image
# - gemini_generate_image  
# - falai_generate_image
# - falai_edit_image
# - generate_character_sheet
# - generate_character_variation
# - generate_pixel_art_character (with transparent background support)
# - generate_texture (with transparent background support for sprites/decals)
# - generate_object_sheet
# - image_to_3d (unified 3D generation with automatic reference images)

## Transparent Background Generation

The server supports generating images with transparent backgrounds, perfect for game sprites and decals. This uses a two-step process with native JavaScript:

1. Generate the image with a solid white/black background
2. Convert the solid background to transparent alpha using native JavaScript processing

### Features

- **Native JavaScript**: No external dependencies required
- **Auto-detection**: Automatically detects white or black backgrounds
- **Adjustable tolerance**: Control how much color variation to allow
- **PNG support**: Works with PNG images for transparency

### Examples

```bash
# Generate transparent sprite texture
generate_texture \
  --textureDescription "magic fireball effect" \
  --outputPath "fireball_sprite.png" \
  --transparentBackground true \
  --backgroundColor "black" \
  --materialType "diffuse"

# Generate pixel art character with transparent background
generate_pixel_art_character \
  --characterDescription "knight with sword" \
  --outputPath "knight_sprite.png" \
  --pixelDimensions "32x32" \
  --transparentBackground true \
  --colors 16

# Generate 3D model with automatic reference images
image_to_3d \
  --prompt "fantasy sword with ornate handle" \
  --outputPath "sword_model.glb" \
  --model "hunyuan3d" \
  --autoGenerateReferences true

# Generate character sheet with multiple poses
generate_character_sheet \
  --characterDescription "female warrior with armor" \
  --outputPath "warrior_sheet.png" \
  --model "gemini" \
  --style "realistic fantasy" \
  --includeExpressions true \
  --includePoses true
```
```

## Project Structure

```
mcp-game-asset-gen/
├── src/
│   ├── index.ts          # Main server file
│   └── server.test.ts    # Tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT
