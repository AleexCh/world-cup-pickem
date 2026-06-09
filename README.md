# FIFA World Cup 2026 Pick'em

A web application for predicting FIFA World Cup 2026 match scores and building knockout brackets. Compete with friends on the leaderboard and track your prediction accuracy as the tournament progresses.

![World Cup Pick'em](https://img.shields.io/badge/World%20Cup-2026-amber?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-10.14.1-orange?style=for-the-badge&logo=firebase)

## Features

- **Group Stage Predictions**: Predict scores for all 48 group stage matches across 12 groups
- **Live Standings**: View calculated group standings based on your predictions
- **Knockout Stage**: Build your complete knockout bracket from Round of 16 to the Final
- **Real-time Scoring**: Automatic scoring based on actual match results
- **Leaderboard**: Compete with other players and track rankings
- **Firebase Authentication**: Secure user authentication with email/password
- **Admin Panel**: Admin interface for updating knockout teams and match results
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18.2.0
- **Build Tool**: Vite 8.0.16
- **Styling**: Tailwind CSS 3.4.0
- **Backend**: Firebase (Authentication & Firestore)
- **Testing**: Vitest 4.1.8
- **Language**: JavaScript (JSX)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Authentication and Firestore enabled
- Firebase configuration credentials

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/world-cup-pickem.git
   cd world-cup-pickem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password provider)
   - Enable Firestore Database
   - Create a web app in Firebase project settings
   - Copy your Firebase configuration

4. **Configure environment variables**
   - Create a `.env` file in the root directory:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_ADMIN_EMAIL=admin@example.com
     ```

5. **Prepare tournament data**
   - Place `teams.json` in the `public/data/` directory with team information
   - Place `schedule.json` in the `public/data/` directory with match schedule
   - See the existing data files for the required format

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   - Navigate to `http://localhost:5173`

## Usage

### For Players

1. **Sign Up**: Create an account using email and password
2. **Make Predictions**: 
   - Navigate to "Group Matches" to predict group stage scores
   - Navigate to "Knockout Bracket" to build your knockout predictions
3. **View Standings**: Check the "Standings" tab to see group standings based on predictions
4. **Track Progress**: Visit the "Leaderboard" to see how you rank against other players

### For Administrators

1. Set the admin email in the `.env` file (`VITE_ADMIN_EMAIL`)
2. Sign in with the admin email address
3. Access the "Admin" tab to:
   - Update knockout stage teams as group stage completes
   - Input actual match results for scoring
   - Manage tournament data

## Project Structure

```
world-cup-pickem/
├── public/
│   └── data/                 # Tournament data files
│       ├── teams.json        # Team information
│       └── schedule.json     # Match schedule
├── src/
│   ├── components/
│   │   ├── admin/           # Admin panel components
│   │   ├── auth/            # Authentication components
│   │   ├── common/          # Shared components
│   │   ├── dashboard/       # Leaderboard and score components
│   │   ├── knockout/        # Knockout bracket components
│   │   └── tournament/      # Match and standings components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Firebase and external services
│   ├── utils/               # Utility functions (scoring, logic)
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment variables
├── .gitignore              # Git ignore rules
├── index.html              # HTML template
├── package.json            # Project dependencies
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.js          # Vite build configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests in CI mode

## Scoring System

The application uses a comprehensive scoring system:
- **Exact Score**: Full points for predicting the exact score
- **Correct Result**: Partial points for predicting the right winner/draw
- **Bonus Points**: Additional points for difficult predictions

Scores are calculated automatically as match results are updated by administrators.

## Firebase Firestore Structure

The application uses the following Firestore collections:

- `users` - User profiles and authentication data
  - `email`, `displayName`, `totalPoints`, `scoreUpdatedAt`
- `picks` - User predictions for matches
  - `userId`, `matchPicks`, `knockoutPicks`
- `knockoutTeams` - Dynamically updated knockout stage teams
  - `teams` - Map of match IDs to team matchups

### Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Firebase](https://firebase.google.com/)
- Icons and design inspiration from various sources