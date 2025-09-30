#!/bin/bash

echo "🔍 Verifying AWS CTO Game Frontend Setup..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Install Node.js 18+ first."
    exit 1
fi

# Check directory structure
echo ""
echo "📁 Checking directory structure..."
REQUIRED_DIRS=(
    "src/api"
    "src/components/common"
    "src/components/diagram"
    "src/components/game"
    "src/components/hud"
    "src/features/game"
    "src/features/diagram"
    "src/features/ui"
    "src/features/user"
    "src/pages"
    "src/store"
    "src/i18n/locales"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir"
    else
        echo "  ❌ $dir (missing)"
    fi
done

# Check key files
echo ""
echo "📄 Checking key files..."
REQUIRED_FILES=(
    "package.json"
    "vite.config.js"
    "tailwind.config.js"
    "src/App.jsx"
    "src/main.jsx"
    "src/i18n/locales/en.json"
    "src/i18n/locales/ko.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

# Check if node_modules exists
echo ""
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed (node_modules exists)"
else
    echo "⚠️  Dependencies not installed. Run: npm install"
fi

# Check if .env exists
echo ""
if [ -f ".env" ]; then
    echo "✅ Environment configured (.env exists)"
else
    echo "⚠️  Environment not configured. Run: cp .env.example .env"
fi

# Count components
echo ""
COMPONENT_COUNT=$(find src/components -name "*.jsx" 2>/dev/null | wc -l)
echo "📊 Statistics:"
echo "  Components: $COMPONENT_COUNT"
echo "  Pages: $(find src/pages -name "*.jsx" 2>/dev/null | wc -l)"
echo "  Redux Slices: $(find src/features -name "*Slice.js" 2>/dev/null | wc -l)"

echo ""
echo "🎮 Frontend setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. npm install     (if not done)"
echo "  2. cp .env.example .env"
echo "  3. npm run dev"
echo "  4. Open http://localhost:3000"
