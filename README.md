# Art Of Frames Management System (AOF-MS)

A professional business management dashboard for Art Of Frames with cloud-based Supabase storage.

## Features

- **Order Management**: Complete order tracking with categories, items, and pricing
- **Inventory System**: Stock management with low stock alerts
- **Expense Tracker**: Track and categorize business expenses
- **Product Management**: Manage product categories and items with prices
- **Invoice Generation**: Download and send invoices via WhatsApp
- **Dashboard**: View summaries and analytics with charts
- **Cloud Storage**: Data stored in Supabase (accessible from any browser/device)
- **Backup/Export**: Export/import data as JSON files for backup

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher) - Download from [nodejs.org](https://nodejs.org/)
- Supabase account (free) - Sign up at [supabase.com](https://supabase.com)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Supabase Database**
   
   a. **Create Supabase Project** (if not already done):
      - Go to [supabase.com](https://supabase.com) and create a new project
      - Wait for the project to be ready (takes 1-2 minutes)
   
   b. **Run Database Schema**:
      - Open your Supabase project dashboard
      - Go to **SQL Editor**
      - Copy and paste the contents of `supabase-schema.sql`
      - Click **Run** to create all tables
   
   c. **Get Your Credentials**:
      - Go to **Settings** → **API**
      - Copy your **Project URL** and **anon/public key**

3. **Configure Environment Variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   Or copy from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your actual Supabase credentials.

4. **Start the Application**
   
   **Option 1: Double-click `start.bat`** (Windows)
   - This will automatically start the frontend application
   
   **Option 2: Manual Start**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open your browser and go to: `http://localhost:5173`

## Data Storage

### Cloud Storage (Supabase)
- **Primary Storage**: All data is stored in Supabase cloud database
- **Accessible Everywhere**: 
  - ✅ Any browser (Chrome, Firefox, Edge, etc.)
  - ✅ Any device (PC, tablet, phone)
  - ✅ Incognito/Private mode (with internet connection)
  - ✅ Automatic sync across all devices
- **No Manual Backup Needed**: Data is automatically saved to the cloud

### Backup/Export (Optional)
- **Export**: Go to Settings → Data Management → Export to File
  - Saves all data as a JSON file on your PC
  - File name: `aof-ms-backup-YYYY-MM-DD.json`
  - Useful for offline backup or migration
  
- **Import**: Go to Settings → Data Management → Import from File
  - Select a previously exported JSON file
  - All data will be imported to Supabase
  - Page will reload after import

## Database Schema

The database includes the following tables:
- `orders` - Customer orders
- `inventory` - Stock items
- `expenses` - Business expenses
- `products` - Product catalog (stored as JSON)
- `settings` - Application settings (stored as JSON)
- `tracking_numbers` - Tracking number management
- `order_counter` - Sequential order numbering

All tables are created automatically when you run `supabase-schema.sql` in the Supabase SQL Editor.

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure you have a `.env` file in the root directory
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Restart the dev server after creating/updating `.env`

### Database Connection Issues
- Verify your Supabase project is active (not paused)
- Check that you ran the SQL schema in Supabase SQL Editor
- Ensure your API keys are correct in `.env`

### Data Not Saving
- Check browser console for errors (F12)
- Verify Supabase Row Level Security (RLS) policies are set (included in schema)
- Make sure you're using the correct project URL and API key

## Development

- **Frontend**: React + Vite (runs on port 5173)
- **Backend**: Supabase (cloud-hosted PostgreSQL)
- **Build**: `npm run build` - Creates production build in `dist/` folder

## License

Private - Art Of Frames Management System
