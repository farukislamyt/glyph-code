# GlyphCode

GlyphCode is a fully self-contained visual encoding system that converts data into geometric glyphs using shape, rotation, and spatial positioning.

## Features
- No third-party dependencies
- Custom ECC (multi-layer redundancy + interleaving)
- Hybrid encoding (single + multi-frame)
- Canvas-based rendering
- Camera-ready architecture

## Encoding
Each glyph encodes:
- Shape (2 bits)
- Rotation (2 bits)
- Phase (2 bits)

## ECC
- Block-based duplication
- Majority voting recovery
- Interleaving for burst error resistance

## Usage
Open index.html in browser and enter text.

## License
MIT
