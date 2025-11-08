# MCP Asset Generation Server - Development Roadmap

## Current Status
✅ Complete MCP server implementation with image generation capabilities  
✅ Support for OpenAI, Gemini, and FAL.ai image generation APIs  
✅ Character sheet, texture, and object sheet generation tools  
✅ ALLOWED_TOOLS environment variable for tool filtering  
✅ Transparent background generation using ImageMagick  
✅ Refactored image generation with reusable helper functions  
✅ Comprehensive test suite with unit and integration tests (36 tests passing)  
✅ Private package with bin entry for npx usage  

---

## Phase 1: 3D Model Generation with FAL.ai

### Objectives
- Add 3D model generation capabilities using FAL.ai's Trellis and Hunyuan3D 2.0 models
- Support both single and multi-image input variants for each model
- Implement automatic reference image generation when only text prompt is provided
- Handle base64 encoded image URIs as default input format
- Support GLB/GLTF 3D model file formats

### Available FAL.ai 3D Models
Based on OpenAPI schemas:
- **Trellis**: Single image input, Multi image input
- **Hunyuan3D 2.0**: Single image input, Multi image input, Single-turbo, Multi-turbo

### Implementation Tasks

#### 1.1 3D Model Provider Infrastructure
- [ ] Create `src/providers/model3dProviders.ts` for 3D model generation functions
- [ ] Add 3D model utility functions to `src/utils/model3dUtils.ts`
- [ ] Implement base64 image URI handling and validation
- [ ] Add GLB/GLTF file download and saving utilities
- [ ] Create 3D model metadata extraction utilities

#### 1.2 FAL.ai 3D Model Integration
- [ ] Implement `trellisGenerate3DSingle()` function
- [ ] Implement `trellisGenerate3DMulti()` function  
- [ ] Implement `hunyuan3DGenerateSingle()` function
- [ ] Implement `hunyuan3DGenerateMulti()` function
- [ ] Implement `hunyuan3DGenerateSingleTurbo()` function
- [ ] Implement `hunyuan3DGenerateMultiTurbo()` function
- [ ] Add proper error handling for 3D generation failures
- [ ] Handle different 3D model output formats and file sizes

#### 1.3 Automatic Reference Image Generation
- [ ] Create `generateReferenceImages()` helper function
- [ ] Implement front, back, top view generation for multi-input models
- [ ] Implement front-only generation for single-input models
- [ ] Use Gemini as default image generation model for reference images
- [ ] Add reference image cleanup after 3D generation

#### 1.4 3D Model Tool Schemas
- [ ] Add `trellis_generate_3d_model` tool schema to `src/index.ts`
- [ ] Add `hunyuan3d_generate_3d_model` tool schema to `src/index.ts`
- [ ] Support both text-only and image+text input modes
- [ ] Add model variant selection (single/multi/turbo options)
- [ ] Include 3D model output format and quality options

#### 1.5 Tool Handler Implementation
- [ ] Implement `trellis_generate_3d_model` handler
- [ ] Implement `hunyuan3d_generate_3d_model` handler
- [ ] Add automatic reference image generation logic
- [ ] Support base64 image URI inputs
- [ ] Handle 3D model file saving and metadata
- [ ] Add progress tracking for long-running 3D generation

#### 1.6 3D Model Helper Functions
- [ ] Create unified 3D generation interface in `src/providers/model3dHelpers.ts`
- [ ] Add `generate3DModel()` function with automatic reference handling
- [ ] Implement `validate3DModelOptions()` function
- [ ] Add `getDefault3DOptions()` for different model types
- [ ] Create `merge3DWithDefaults()` helper function

#### 1.7 Testing & Validation
- [ ] Write unit tests for all 3D model generation functions
- [ ] Write unit tests for reference image generation
- [ ] Write unit tests for 3D model utilities and helpers
- [ ] Create integration tests with real FAL.ai API calls
- [ ] Test end-to-end workflow: prompt → reference images → 3D model
- [ ] Test both single and multi-image input workflows

#### 1.8 Documentation & Examples
- [ ] Update `.env.example` with 3D model documentation
- [ ] Update `AGENTS.md` with 3D model tool usage and examples
- [ ] Update `README.md` with 3D generation examples and workflows
- [ ] Document base64 image URI format requirements
- [ ] Add troubleshooting guide for common 3D generation issues

### Technical Specifications

#### Input Formats
- **Text prompts**: Automatic reference image generation
- **Base64 image URIs**: `data:image/png;base64,<base64-data>`
- **File paths**: Local image file support
- **Multi-image**: Arrays of base64 URIs or file paths

#### Output Formats
- **Primary**: GLB (binary GLTF) for web/game compatibility
- **Secondary**: GLTF (JSON) for debugging and inspection
- **Metadata**: Model dimensions, vertex count, generation time

#### Model Selection Logic
```typescript
// Automatic model selection based on input
if (inputImages.length === 0) {
  // Generate reference images → use multi-input model
  generateReferenceImages() → useMultiInputModel()
} else if (inputImages.length === 1) {
  // Use single-input model
  useSingleInputModel()
} else {
  // Use multi-input model
  useMultiInputModel()
}
```

#### Reference Image Generation
```typescript
// For multi-input models: front, back, top views
const views = ['front view', 'back view', 'top view'];
// For single-input models: front view only  
const views = ['front view'];
// Use Gemini with consistent styling and lighting
```

### Expected Deliverables
- 6 new 3D model generation functions (Trellis + 4 Hunyuan3D variants)
- 2 new MCP tools with automatic reference image generation
- Comprehensive 3D model helper library
- Support for base64 image URI inputs
- Full test coverage for 3D generation workflows
- Updated documentation and examples
- End-to-end workflow testing

### Expected Deliverables
- Two new tools: `trellis_generate_3d_model` and `hunyuan3d_generate_3d_model`
- Refactored image generation helper functions
- Comprehensive test coverage for 3D generation
- Updated documentation and examples

---

## Phase 2: Sprite Sheet Generation

### Objectives
- Create specialized tool for 2D character pixel art generation
- Support both static sprites and animated sprite sheets
- Implement deterministic prompting and formatting
- Provide specific output formats for game development

### Implementation Tasks

#### 2.1 Sprite Generation Research
- [ ] Define standard sprite sheet formats and dimensions
- [ ] Research optimal prompting for pixel art character generation
- [ ] Determine animation frame layouts and naming conventions
- [ ] Plan sprite categories (characters, objects, effects, etc.)

#### 2.2 Sprite Generation Helper Functions
- [ ] Create `src/providers/spriteHelpers.ts`
- [ ] Implement pixel art prompting logic
- [ ] Create sprite sheet layout generators
- [ ] Add animation frame sequencing utilities
- [ ] Implement format validation and metadata generation

#### 2.3 Sprite Sheet Tool Implementation
- [ ] Add `generate_pixel_art_spritesheet` tool schema
- [ ] Support static sprite generation (single frames)
- [ ] Support animated sprite generation (multiple frames)
- [ ] Implement configurable grid layouts (e.g., 4x4, 8x8)
- [ ] Add sprite naming and metadata output

#### 2.4 Advanced Sprite Features
- [ ] Support multiple character poses (idle, walk, jump, attack)
- [ ] Add directional sprites (up, down, left, right)
- [ ] Implement color palette consistency
- [ ] Add sprite sheet optimization options

#### 2.5 Testing & Documentation
- [ ] Write unit tests for sprite generation helpers
- [ ] Write integration tests for sprite sheet generation
- [ ] Create example sprite sheets and documentation
- [ ] Add sprite generation examples to README
- [ ] Test sprite output in common game engines

### Expected Deliverables
- New tool: `generate_pixel_art_spritesheet`
- Comprehensive sprite generation helper library
- Support for static and animated sprite sheets
- Game-ready output formats and documentation

---

## Technical Considerations

### File Management
- [ ] Consider file organization for generated assets (images, 3D models, sprites)
- [ ] Implement cleanup strategies for large generated files
- [ ] Add file format validation and conversion utilities

### Performance & Optimization
- [ ] Monitor API usage and implement rate limiting
- [ ] Consider caching for repeated generation requests
- [ ] Optimize file sizes for generated assets

### Error Handling
- [ ] Standardize error responses across all providers
- [ ] Add retry logic for failed API calls
- [ ] Implement graceful degradation for unavailable services

### Future Enhancements
- [ ] Audio generation capabilities
- [ ] Video generation for animated assets
- [ ] Asset packaging and export tools
- [ ] Integration with popular game engines

---

## Development Notes

### Dependencies to Monitor
- FAL.ai API updates for new 3D models
- Image generation provider improvements
- File format library updates

### Testing Strategy
- Maintain high test coverage (>90%)
- Use mock providers for unit tests
- Run integration tests with real APIs regularly
- Test file generation and validation thoroughly

### Documentation Standards
- Keep AGENTS.md updated with latest tool usage
- Provide clear examples in README.md
- Document all environment variables and configuration options
- Include troubleshooting guides for common issues