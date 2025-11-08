# MCP Asset Generation Server

A Model Context Protocol (MCP) server for generating various types of assets including images, videos, audio, and 3D models for game development.

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
cd mcp-asset-gen

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

- `generate_image`: Generate images using various APIs
  - Parameters:
    - `prompt` (required): Text description of the image
    - `provider` (required): 'openai', 'gemini', or 'fal'
    - `width` (optional): Image width in pixels
    - `height` (optional): Image height in pixels

- `trellis_generate_3d_model`: Generate 3D models using FAL.ai Trellis
  - Parameters:
    - `prompt` (required): Text description of the 3D model
    - `input_image_uris` (optional): Array of base64 image URIs for reference (auto-generated if not provided)
    - `output_path` (required): Path to save the generated 3D model (.glb or .gltf)
    - `format` (optional): Output format ('glb' or 'gltf', default: 'glb')
    - `variant` (optional): Model variant ('single' or 'multi', default: auto-selected)

- `hunyuan3d_generate_3d_model`: Generate 3D models using FAL.ai Hunyuan3D 2.0
  - Parameters:
    - `prompt` (required): Text description of the 3D model
    - `input_image_uris` (optional): Array of base64 image URIs for reference (auto-generated if not provided)
    - `output_path` (required): Path to save the generated 3D model (.glb or .gltf)
    - `format` (optional): Output format ('glb' or 'gltf', default: 'glb')
    - `variant` (optional): Model variant ('single', 'multi', 'single-turbo', or 'multi-turbo', default: auto-selected)

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
# - generate_pixel_art_character (now with transparent background support)
# - generate_texture (now with transparent background support for sprites/decals)
# - generate_object_sheet
# - trellis_generate_3d_model
# - hunyuan3d_generate_3d_model

## Transparent Background Generation

The server now supports generating images with transparent backgrounds, perfect for game sprites and decals. This uses a two-step process:

1. Generate the image with a solid white/black background
2. Use ImageMagick to convert the solid background to transparent alpha

### Prerequisites

Install ImageMagick for transparent background generation:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows
# Download from https://imagemagick.org/script/download.php
```

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
```
```

## Project Structure

```
mcp-asset-gen/
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