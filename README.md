# NYC Civic Calendar

A web app for subscribing to NYC government meeting calendars. Select the organizations you want to track and get a personalized ICS calendar feed.

## Features

- Hierarchical organization browser (City Council committees, MTA boards, city agencies)
- Personalized ICS calendar feed based on your selections
- Works with Google Calendar, Outlook, Apple Calendar, and any app that supports ICS subscriptions
- Weekly automatic data refresh

## Supported Organizations

### City Council
- Stated Meetings
- 35+ Standing Committees (Finance, Land Use, Transportation, etc.)
- Subcommittees and Task Forces

### State Authorities
- MTA Board
- MTA Committees (Finance, Capital Program, Safety, Audit)
- Agency Committees (NYC Transit, LIRR/Metro-North, Bridges & Tunnels)

### City Agencies
- Department of Transportation (DOT)
- Department of Buildings (DOB)
- Department of Education (DOE)
- Panel for Educational Policy (PEP)

## Deployment

### 1. Deploy to Vercel

```bash
npm i -g vercel
cd nyc-civic-calendar
vercel
```

### 2. Get API Keys

**Legistar API (for City Council):**
1. Go to https://council.nyc.gov/legislation/api/
2. Fill out the form with your name and email
3. You'll receive an API key via email

**NYC Events Calendar API (for Agencies):**
1. Go to https://api-portal.nyc.gov/
2. Create an account
3. Subscribe to the Events Calendar API
4. Get your subscription key

### 3. Configure Environment Variables

In Vercel dashboard (or `.env.local` for local dev):

```
LEGISTAR_API_KEY=your_legistar_key_here
NYC_API_KEY=your_nyc_api_key_here
```

### 4. Trigger Initial Data Refresh

Visit `/api/cron` to populate the meeting data, or wait for the weekly cron job.

## Local Development

```bash
npm install
npm run dev
```

The app will be available at http://localhost:3000

## Project Structure

```
nyc-civic-calendar/
├── public/              # Static frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── api/                 # Vercel serverless functions
│   ├── calendar.ics.js  # ICS feed generator
│   └── cron.js          # Weekly data refresh
├── lib/
│   ├── organizations.js # Org hierarchy config
│   ├── ics-generator.js # ICS format generator
│   └── scrapers/        # Data scrapers
├── data/                # Meeting data (JSON)
└── vercel.json          # Vercel config + cron
```

## API Endpoints

- `GET /api/calendar.ics?orgs=...` - Generate ICS feed for selected orgs
- `GET /api/cron` - Trigger data refresh (protected in production)

## Adding New Organizations

1. Add the organization to `lib/organizations.js`
2. Update the corresponding scraper in `lib/scrapers/`
3. Add sample data to `data/` if needed
4. Update the frontend `public/app.js` with the new hierarchy
