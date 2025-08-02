#!/bin/bash

echo "🚀 PRODUCTION ENVIRONMENT SETUP"
echo "==============================="
echo

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production file not found!"
    echo "Creating .env.production template..."
    
    cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production

# Database Configuration
DATABASE_URL=your_production_database_url_here

# Cashfree Production API Credentials
CASHFREE_CLIENT_ID=your_cashfree_client_id_here
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret_here
CASHFREE_PUBLIC_KEY=your_cashfree_public_key_here
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_secret_here
CASHFREE_KYC_BASE_URL=https://api.cashfree.com/verification

# Exchange Rate API
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key_here

# Other Production Settings
PORT=3001
EOF
    
    echo "✅ Created .env.production template"
    echo "📝 Please edit .env.production and add your production credentials"
    echo
else
    echo "✅ Found .env.production file"
fi

# Check current environment
echo "🔍 Current Environment Status:"
echo "   NODE_ENV: ${NODE_ENV:-not set}"
echo "   Current directory: $(pwd)"
echo

# Check if production credentials are configured
if [ -f .env.production ]; then
    echo "📋 Production Configuration Check:"
    
    # Source the production environment
    source .env.production
    
    if [ -z "$CASHFREE_CLIENT_ID" ] || [ "$CASHFREE_CLIENT_ID" = "your_cashfree_client_id_here" ]; then
        echo "   ❌ CASHFREE_CLIENT_ID not configured"
    else
        echo "   ✅ CASHFREE_CLIENT_ID configured"
    fi
    
    if [ -z "$CASHFREE_CLIENT_SECRET" ] || [ "$CASHFREE_CLIENT_SECRET" = "your_cashfree_client_secret_here" ]; then
        echo "   ❌ CASHFREE_CLIENT_SECRET not configured"
    else
        echo "   ✅ CASHFREE_CLIENT_SECRET configured"
    fi
    
    if [ -z "$CASHFREE_PUBLIC_KEY" ] || [ "$CASHFREE_PUBLIC_KEY" = "your_cashfree_public_key_here" ]; then
        echo "   ❌ CASHFREE_PUBLIC_KEY not configured"
    else
        echo "   ✅ CASHFREE_PUBLIC_KEY configured"
    fi
    
    if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "your_production_database_url_here" ]; then
        echo "   ⚠️  DATABASE_URL not configured (will use testing mode)"
    else
        echo "   ✅ DATABASE_URL configured"
    fi
fi

echo
echo "🏭 To start in production mode:"
echo "   1. Configure credentials in .env.production"
echo "   2. Run: npm run production"
echo "   3. Or manually: NODE_ENV=production npm start"
echo
echo "🧪 To test production APIs:"
echo "   1. Start server in production mode first"
echo "   2. Run: node production-test.js"
echo
echo "⚠️  IMPORTANT NOTES:"
echo "   • Production mode uses REAL Cashfree API calls"
echo "   • Real charges may apply for API usage"
echo "   • IP must be whitelisted in Cashfree production dashboard"
echo "   • Real OTP will be sent to registered mobile numbers"
echo
echo "✅ Setup complete!"
EOF
